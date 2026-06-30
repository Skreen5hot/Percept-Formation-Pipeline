// S2 pin: the #3 re-seat over the STAR ABoxes. The global invariant -- NO fsdd: gap-record sits in the OBJECT
// slot of ANY fan: property -- is checked structurally over the emitted triples (the same data that serializes;
// this mirrors the DL gate's check S). RED-first against the current emitter (the ICE record rides
// fan:orderOccupies); GREEN after the re-seat onto fsdd:hasImplicitEntity / fsdd:hasUnresolvedRole.
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStar } from '../../../gm.js';

const RECORD_TYPES = new Set(['fsdd:ImplicitEntityRecord', 'fsdd:UnresolvedRole', 'fsdd:ExcludedFrame', 'fsdd:ProjectionRecord']);
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  RED:', msg); fails++; } };

function lintAndShape(name) {
  const rows = STAR_SAMPLES[name].factRows;
  const triples = materializeStar(resolveStar(rows), rows).triples;
  // record-node IRIs: subjects typed as an fsdd record kind
  const recordNodes = new Set(triples.filter(t => t.p === 'rdf:type' && RECORD_TYPES.has(t.o)).map(t => t.s));
  // #3 LINT: no fan: property points AT a record node
  const violations = triples.filter(t => t.p.startsWith('fan:') && recordNodes.has(t.o));
  ok(violations.length === 0, `[${name}] #3 clean -- no fsdd record in a fan: object slot (found ${violations.length}: ${violations.map(v => v.p).join(',')})`);
  return triples;
}

// --- star-clean + star-orphan: must stay #3-clean (orphan emits a standalone ExcludedFrame) ---
lintAndShape('clean');
lintAndShape('orphan');

// --- star-ice: the orderOccupies ICE must be RE-SEATED + carry the signed honesty shape ---
const t = lintAndShape('ice');
const has = (s, p, o, lit) => t.some(x => x.s === s && x.p === p && x.o === o && (lit ? x.lit === true : !x.lit));
const iceNode = t.find(x => x.p === 'rdf:type' && x.o === 'fsdd:ImplicitEntityRecord')?.s;
const frame = t.find(x => x.p === 'rdf:type' && x.o === 'fan:ActOfOrdering')?.s;
ok(!!iceNode, '[ice] an ImplicitEntityRecord node exists');
ok(!!frame, '[ice] the ActOfOrdering frame node exists');
if (iceNode && frame) {
  ok(has(frame, 'fsdd:hasImplicitEntity', iceNode), '[ice] frame fsdd:hasImplicitEntity -> record (re-seated off fan:orderOccupies)');
  ok(has(iceNode, 'fsdd:role', 'fan:orderOccupies', false), "[ice] record fsdd:role = IRI 'fan:orderOccupies' (NOT the literal 'orderOccupies')");
  ok(has(iceNode, 'fsdd:concernsType', 'fan:Date', false), '[ice] record fsdd:concernsType fan:Date (the absent filler kind)');
  ok(has(iceNode, 'fsdd:aboutFrame', frame), '[ice] record fsdd:aboutFrame -> frame (realist aboutness witness)');
  ok(has(iceNode, 'fsdd:status', 'unwitnessed', true), '[ice] record fsdd:status "unwitnessed"');
  // and the OLD violation must be gone
  ok(!t.some(x => x.p === 'fan:orderOccupies'), '[ice] NO fan:orderOccupies edge remains anywhere');
}

if (fails) { console.error(`\nS2 RE-SEAT PIN: RED (${fails} failed)`); process.exit(1); }
console.log('S2 RE-SEAT PIN: GREEN (#3-clean star ABoxes; ICE re-seated with signed honesty shape)');
