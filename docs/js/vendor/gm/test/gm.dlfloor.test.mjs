// FAST DL FLOOR (the every-push inline gate): over each live honesty-ladder sample's emitted graph, assert the
// two things a DL reasoner is NOT needed for and that bite hardest -- the #3 structural invariant (no fsdd:
// gap-record in a fan: object slot) and REFERENTIAL INTEGRITY (Gate F: every fan: predicate / fan: class used
// is DECLARED in the law TBox -- catches a dangling ref like a leftover fan:hasCustomer the reasoner can't see).
// The full OWL-DL consistency gate (HermiT + CCO) runs as a SEPARATE, heavier job; this floor keeps every push
// honest in milliseconds. Known terms are read from the vendored compiled law (single source of truth).
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStar, materializeStarSnowflake } from '../../../gm.js';
import LAW from '../../law/actofordering_law.mjs';

const knownClasses = new Set((LAW.classes || []).filter((c) => c.startsWith('fan:')));
const knownProps = new Set(Object.keys(LAW.properties || {}).filter((p) => p.startsWith('fan:')));
knownProps.add('fan:dateValue');   // a DatatypeProperty (signed law) -- not in the compiled ObjectProperty set
const RECORD_TYPES = new Set(['fsdd:ImplicitEntityRecord', 'fsdd:UnresolvedRole', 'fsdd:ExcludedFrame', 'fsdd:ProjectionRecord']);

let fails = 0;
const bad = (m) => { console.error('  FLOOR-FAIL:', m); fails++; };

for (const name of Object.keys(STAR_SAMPLES)) {
  const rows = STAR_SAMPLES[name].factRows;
  const r = resolveStar(rows);
  const t = (name === 'snowflake' ? materializeStarSnowflake(r, rows) : materializeStar(r, rows)).triples;
  const recordNodes = new Set(t.filter((x) => x.p === 'rdf:type' && RECORD_TYPES.has(x.o)).map((x) => x.s));
  for (const x of t) {
    // (S) #3 structural lint
    if (x.p.startsWith('fan:') && recordNodes.has(x.o)) bad(`[${name}] #3 violation: ${x.p} points at an fsdd record node`);
    // (F) referential integrity -- predicate
    if (x.p.startsWith('fan:') && !knownProps.has(x.p)) bad(`[${name}] dangling fan: predicate ${x.p} (not declared in the law TBox)`);
    // (F) referential integrity -- rdf:type object (skip typed-literal objects)
    if (x.p === 'rdf:type' && typeof x.o === 'string' && x.o.startsWith('fan:') && !knownClasses.has(x.o)) bad(`[${name}] dangling fan: class ${x.o} (not declared in the law TBox)`);
  }
}

if (fails) { console.error(`\nDL FLOOR: RED (${fails} failed)`); process.exit(1); }
console.log('DL FLOOR: GREEN (#3-clean + no dangling fan: refs across all 4 honesty-ladder samples)');
