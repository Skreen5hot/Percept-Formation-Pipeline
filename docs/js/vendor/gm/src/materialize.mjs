import { entityIRI, nodeIRI, frameIRI } from './iri.mjs';

export const TRANSFORM_VERSION = 'graph-materialization/1.5';

export function materialize(result, mapping, factRow) {
  const triples = [];
  const push = (s, p, o, lit) => triples.push(lit ? { s, p, o, lit: true } : { s, p, o });
  const type = (s, cls) => push(s, 'rdf:type', cls);

  const frameKey = 'ord-' + factRow.order_id;
  const F = frameIRI(mapping.recordConcept, frameKey);

  // (1) EXCLUDED
  if (result.outcome === 'dangling') {
    const X = nodeIRI('excluded', frameKey);
    type(X, 'fsdd:ExcludedFrame');
    const danglers = result.defect.diagnostic.danglers;
    const roles = danglers.map(d => {
      const r = mapping.roles.find(r => r.column === d.fieldId);
      return r ? r.role : d.fieldId;
    });
    push(X, 'fsdd:reason', 'dangling-constitutive:' + roles.join(','), true);
    // NEVER emit {F, 'rdf:type', mapping.recordConcept}
    return { triples };
  }

  // (2) NON-EXCLUDED
  type(F, mapping.recordConcept);

  // ProjectionRecord
  const P = nodeIRI('proj', frameKey);
  type(P, 'fsdd:ProjectionRecord');
  push(P, 'fsdd:sourceFsddHash', result.dictionary['fsdd:dictionaryVersion'], true);
  push(P, 'fsdd:transformVersion', TRANSFORM_VERSION, true);
  push(P, 'fsdd:projectionRules', 'resolved+absent+broken', true);
  push(F, 'fsdd:projectedBy', P);

  for (const role of mapping.roles) {
    // (a) ABSENT (constitutive): check ice BEFORE resolved so a dangling non-null FK is not mistaken for resolved
    const iceEntry = (result.ice || []).find(ice => ice['fsdd:role'] === role.role);
    if (iceEntry) {
      const u = nodeIRI('ice', frameKey, role.role);
      push(F, 'fan:' + role.role, u);
      type(u, 'fsdd:ImplicitEntityRecord');
      push(u, 'fsdd:concernsType', role.concept);
      push(u, 'fsdd:role', role.role, true);
      // NEVER type(u, role.concept) -- ICE is ABOUT the type, not an instance of it
      continue;
    }

    // (b) ACCIDENTAL-BROKEN: check roleDefects BEFORE resolved
    const rd = (result.roleDefects || []).find(rd => rd.role === role.role);
    if (rd) {
      const u = nodeIRI('unresolved', frameKey, role.role);
      push(F, 'fan:' + role.role, u);
      type(u, 'fsdd:UnresolvedRole');
      push(u, 'fsdd:role', role.role, true);
      push(u, 'fsdd:concernsType', role.concept);
      push(u, 'fsdd:reason', rd.diagnostic.reason, true);
      // NEVER type(u, role.concept) -- a broken ref must not materialize the entity it failed to find
      continue;
    }

    // (c) RESOLVED: factRow[role.column] is non-null/defined
    if (factRow[role.column] != null) {
      const fields = result.dictionary['fsdd:hasField'] || [];
      const field = fields.find(f => f['fsdd:column'] === role.column);
      if (!field || !field['fsdd:groundedConcept'] || !field['fsdd:groundedConcept']['@id']) {
        // Malformed dictionary: LOUD, never silent fallback to mapping concept
        throw new Error('Malformed dictionary: missing fsdd:groundedConcept for column ' + role.column);
      }
      const concept = field['fsdd:groundedConcept']['@id'];
      const e = entityIRI(concept, factRow[role.column]);
      push(F, 'fan:' + role.role, e);
      type(e, concept);
      continue;
    }

    // (d) accidental null FK that did not dangle: emit nothing
  }

  return { triples };
}
