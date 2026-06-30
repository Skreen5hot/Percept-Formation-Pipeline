import { entityIRI, nodeIRI, frameIRI } from './iri.mjs';

export const TRANSFORM_VERSION = 'graph-materialization/1.5';

export function materialize(result, mapping, factRow, dateByKey = {}) {
  const triples = [];
  // S4: optional 5th arg `dt` (a datatype term, e.g. 'xsd:date') wraps o as a typed literal { value, datatype }
  // the serializer's third branch emits as "o"^^dt. Additive: dt undefined -> the original IRI/plain-literal behavior.
  const push = (s, p, o, lit, dt) => triples.push(dt ? { s, p, o: { value: o, datatype: dt } } : (lit ? { s, p, o, lit: true } : { s, p, o }));
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
  push(P, 'fsdd:aboutFrame', F);   // the ProjectionRecord (an ICE) is ABOUT the frame it projected (is-about witness; projectedBy stays act->record)

  for (const role of mapping.roles) {
    // (a) ABSENT (constitutive): check ice BEFORE resolved so a dangling non-null FK is not mistaken for resolved
    const iceEntry = (result.ice || []).find(ice => ice['fsdd:role'] === role.role);
    if (iceEntry) {
      const u = nodeIRI('ice', frameKey, role.role);
      push(F, 'fsdd:hasImplicitEntity', u);          // #3: re-seat OFF the fan: range slot onto the decoupled meta-property (frame -> record); the record is the OBJECT (range = ImplicitEntityRecord)
      type(u, 'fsdd:ImplicitEntityRecord');
      push(u, 'fsdd:role', 'fan:' + role.role);      // #4.G: the property IRI (annotation), not the legacy bare string
      push(u, 'fsdd:concernsType', role.concept);    // the absent filler's kind (the fan: class IRI, read lexically)
      push(u, 'fsdd:status', 'unwitnessed', true);
      push(u, 'fsdd:aboutFrame', F);                  // record -> frame: the realist is-about witness (is-about domain = ICE)
      // NEVER type(u, role.concept) -- ICE is ABOUT the type, not an instance of it; NEVER place u in a fan: slot (#3)
      continue;
    }

    // (b) ACCIDENTAL-BROKEN: check roleDefects BEFORE resolved
    const rd = (result.roleDefects || []).find(rd => rd.role === role.role);
    if (rd) {
      const u = nodeIRI('unresolved', frameKey, role.role);
      push(F, 'fsdd:hasUnresolvedRole', u);          // #3: re-seat OFF the fan: range slot (frame -> record)
      type(u, 'fsdd:UnresolvedRole');
      push(u, 'fsdd:role', 'fan:' + role.role);      // #4.G: the property IRI
      push(u, 'fsdd:concernsType', role.concept);
      push(u, 'fsdd:reason', rd.diagnostic.reason, true);
      push(u, 'fsdd:aboutFrame', F);                  // record -> frame
      // NEVER type(u, role.concept) -- a broken ref must not materialize the entity it failed to find; NEVER a fan: slot (#3)
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
      // S7 (Decision-D): a date-ranged role mints a DISTINCT fan:Date individual PER ACT (keyed by the act+role,
      // NOT the calendar value -- closes the #G shared-Date co-temporality bug) carrying the witnessed source
      // date via fan:dateValue. orderOccupies range is a temporal-region CLASS, so the region individual carries
      // the literal; a bare literal could not fill the occupies grounding.
      if (concept === 'fan:Date') {
        const d = nodeIRI('date', frameKey, role.role);
        push(F, 'fan:' + role.role, d);
        type(d, concept);
        const dv = dateByKey[factRow[role.column]];
        if (dv != null) push(d, 'fan:dateValue', dv, false, 'xsd:date');   // typed literal "YYYY-MM-DD"^^xsd:date
        continue;
      }
      const e = entityIRI(concept, factRow[role.column]);
      push(F, 'fan:' + role.role, e);
      type(e, concept);
      // S6 party co-typing: the node is the fan:Party BEARER (via concept) co-typed with its WITNESSED kind
      // (cco:Organization / cco:Person). Only party dims carry role.cotype; product/date/shipInfo have none.
      if (role.cotype) type(e, role.cotype);
      // S6 role layer (orderer ONLY -- signed: only the orderer's customer-role has its realizing act IN this
      // frame; the other parties are routed by their relations without a role until their occurrents are modeled, Decision-C).
      if (role.role === 'hasOrderer') {
        const rn = nodeIRI('role', frameKey, role.role);
        type(rn, 'fan:CustomerRole');
        push(e, 'obo:BFO_0000196', rn);   // orderer bearer-of the customer role
        push(rn, 'obo:BFO_0000054', F);   // BFO_0000054 HAS-REALIZATION: the role -> the act that realizes it (realizable -> process). The triple direction is correct; the inverse "realized in" is BFO_0000055.
      }
      continue;
    }

    // (d) accidental null FK that did not dangle: emit nothing
  }

  return { triples };
}
