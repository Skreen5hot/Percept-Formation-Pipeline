import { roleSlots, constitutiveLocals, propertyByLocal, inherenceNecessities } from './lawAdapter.mjs';
import { KIND, localName } from './types.mjs';

const RELATIONAL = KIND.RELATIONAL ?? 'relational';
const INHERENCE = KIND.INHERENCE ?? 'inherence';

function canonicalOrder(pairs) {
  const kindOrder = { subsumption: 0, inherence: 1, relational: 2 };
  return pairs.slice().sort((a, b) => {
    const ka = kindOrder[a.necessity.kind] ?? 99;
    const kb = kindOrder[b.necessity.kind] ?? 99;
    if (ka !== kb) return ka - kb;
    return a.necessity.relation < b.necessity.relation ? -1 : a.necessity.relation > b.necessity.relation ? 1 : 0;
  });
}

export function collect(law, normalized) {
  if (normalized.recordConcept) {
    // ProposedBinding path
    const slots = roleSlots(law, normalized.recordConcept);
    const edges = normalized.edges ?? [];
    const pairs = slots.map((slot) => {
      const rel = localName(slot.role);
      const necessity = {
        relation: rel,
        kind: RELATIONAL,
        requiredType: slot.relatumType,
        multiplicity: slot.multiplicity,
      };
      const edge = edges.find((e) => e.relation === rel) ?? null;
      return { necessity, edge };
    });
    return canonicalOrder(pairs);
  } else {
    // ProposedState path
    const edges = normalized.edges ?? [];
    const inNecs = inherenceNecessities(law);
    const pairs = [];
    for (const edge of edges) {
      const matched = inNecs.find((n) => n.relation === edge.relation);
      if (matched) {
        pairs.push({
          necessity: {
            relation: edge.relation,
            kind: INHERENCE,
            requiredBearer: matched.requiredBearer,
          },
          edge,
        });
      }
    }
    return canonicalOrder(pairs);
  }
}
