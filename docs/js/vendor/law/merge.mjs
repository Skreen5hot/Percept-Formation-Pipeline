// Merge two compiled constitutive laws (W2Fuel slice) into ONE law object the demo's Binder + OCE consume,
// so abductive frame selection has BOTH frames to choose among. Pure, deterministic.
//
// Merge contract (clinical-measurement-frame-01 v0.2.1 section 8, capability re-review):
//  - classes: union+sort.
//  - subClassOf / subClassOfClosure / disjointWith: union of array values per key (shared anchors like
//    fan:Agent, fan:Date, bfo:* dedupe; no conflicting parents exist across the two laws).
//  - properties: union. fan:occupies COLLIDES (shipping domain ActOfShipping vs clinical ActOfMeasuring) ->
//    last-write-wins on the scalar domain is HARMLESS: no binding-path consumer reads properties[prop].domain
//    (role reads are frame-scoped via frames[frame].roles). The two INHERENCE properties have DISTINCT ids
//    (fan:inheresIn vs fan:analyteInheresIn) so BOTH survive the union; the Inherence-Completion capability
//    disambiguates by most-specific matching domain.
//  - frames / rcr: union (one disjoint frame key each).
function unionArrays(a, b) { return [...new Set([...(a || []), ...(b || [])])]; }

function mergeMapOfArrays(a, b) {
  const out = {};
  for (const k of Object.keys(a || {})) out[k] = [...a[k]];
  for (const k of Object.keys(b || {})) out[k] = out[k] ? unionArrays(out[k], b[k]) : [...b[k]];
  return out;
}

export function mergeLaws(a, b) {
  return {
    '@type': 'w2fuel:MergedLaw',
    sources: [a && a.source, b && b.source].filter(Boolean),
    classes: [...new Set([...((a && a.classes) || []), ...((b && b.classes) || [])])].sort(),
    subClassOf: mergeMapOfArrays(a && a.subClassOf, b && b.subClassOf),
    subClassOfClosure: mergeMapOfArrays(a && a.subClassOfClosure, b && b.subClassOfClosure),
    disjointWith: mergeMapOfArrays(a && a.disjointWith, b && b.disjointWith),
    properties: { ...((a && a.properties) || {}), ...((b && b.properties) || {}) },
    frames: { ...((a && a.frames) || {}), ...((b && b.frames) || {}) },
    rcr: { ...((a && a.rcr) || {}), ...((b && b.rcr) || {}) },
  };
}
