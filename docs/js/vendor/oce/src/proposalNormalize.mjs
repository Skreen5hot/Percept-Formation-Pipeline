import { localName } from './types.mjs';

export function normalize(proposal) {
  if (proposal.recordConcept !== undefined) {
    const rawEdges = proposal.roleBindings || proposal.bindings || [];
    return {
      kind: 'binding',
      recordConcept: proposal.recordConcept,
      edges: rawEdges.map(b => ({
        relation: localName(b.role),
        relatumConcept: b.relatumConcept ?? null,
        fieldId: b.fieldId
      }))
    };
  }
  const individualsMap = {};
  for (const ind of (proposal.individuals || [])) {
    individualsMap[ind.id] = ind.types || [];
  }
  return {
    kind: 'state',
    individuals: individualsMap,
    edges: (proposal.assertions || []).map(a => ({
      relation: localName(a.relation),
      subject: a.subject,
      object: a.object,
      relatumConcept: (individualsMap[a.object] && individualsMap[a.object].length > 0)
        ? individualsMap[a.object][0]
        : null
    }))
  };
}
