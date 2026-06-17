import { localName } from './types.mjs';

export function resolveConcept(law, iri) {
  return law.classes.includes(iri) || Object.hasOwn(law.frames, iri);
}

export function supers(law, type) {
  const closure = Object.hasOwn(law.subClassOfClosure, type) ? law.subClassOfClosure[type] : [];
  return [type, ...closure];
}

export function subsumes(law, a, b) {
  if (a === b) return true;
  return supers(law, a).includes(b);
}

export function disjointPair(law, a, b) {
  const supersA = supers(law, a);
  const supersB = new Set(supers(law, b));
  for (const x of supersA) {
    if (!Object.hasOwn(law.disjointWith, x)) continue;
    for (const y of law.disjointWith[x]) {
      if (supersB.has(y)) return [x, y];
    }
  }
  return null;
}

export function disjoint(law, a, b) {
  return disjointPair(law, a, b) !== null;
}

export function roleSlots(law, concept) {
  return (law.frames[concept] || {}).roles || [];
}

export function constitutiveLocals(law, concept) {
  const rcr = Object.hasOwn(law.rcr, concept) ? law.rcr[concept] : {};
  return (rcr.constitutive || []).map(localName);
}

export function accidentalLocals(law, concept) {
  const rcr = Object.hasOwn(law.rcr, concept) ? law.rcr[concept] : {};
  return (rcr.accidental || []).map(localName);
}

export function propertyByLocal(law, local) {
  for (const key of Object.keys(law.properties)) {
    if (localName(key) === local) return law.properties[key];
  }
  return null;
}

export function inherenceNecessities(law) {
  const result = [];
  for (const key of Object.keys(law.properties)) {
    const prop = law.properties[key];
    if (Object.hasOwn(prop, 'requiredBearer')) {
      result.push({ relation: localName(key), requiredBearer: prop.requiredBearer });
    }
  }
  return result;
}
