import { roleSlots, constitutiveLocals, accidentalLocals } from './lawAdapter.mjs';

export function project(law, concept) {
  return {
    concept,
    roles: roleSlots(law, concept),
    rcr: law.rcr[concept] || null,
    subClassOf: law.subClassOf,
    disjointWith: law.disjointWith,
    properties: law.properties
  };
}
