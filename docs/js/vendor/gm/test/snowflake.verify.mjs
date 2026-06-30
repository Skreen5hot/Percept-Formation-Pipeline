// OUTPUT-FIDELITY verification of the SNOWFLAKE front (the structured front's resolution made graph-capable):
// runs the LIVE runStar -> materializeStarSnowflake over the snowflake sample and asserts the four per-subject
// hop outcomes + the dedupe-retains-all-edges guarantee + the subject-concept divergence guard, in the EMITTED
// graph (not that a graph was produced). Deploy-gate check (spec snowflake-front v0.1.5 sec 8); the rdflib
// real-parse of the serialized bytes (snowflake_parse.py) is the companion layer-4 check in the gate.
// BFO/CCO re-grounding: the hop DESIGNATES the consignee (fan:hasShipToParty), the consignee is a fan:Party,
// and a dangling hop re-seats onto fsdd:hasUnresolvedRole (never the fan: slot, #3).
import { runStar } from '../../../runner.js';
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStarSnowflake } from '../../../gm.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const { stages } = await runStar(STAR_SAMPLES.snowflake.factRows);
const tt = stages.gm.triples;
const objOf = (s, p) => tt.filter((t) => t.s === s && t.p === p).map((t) => t.o);
const typesOf = (n) => tt.filter((t) => t.s === n && t.p === 'rdf:type').map((t) => t.o);

// === COREFERENCE: SI1 ship-to === the orderer's party === fdata:Party/C1 (ONE node, across path lengths) ===
const si1cust = objOf('fdata:ShipInfo/SI1', 'fan:hasShipToParty');
const ordCust = objOf('fdata:ActOfOrdering/ord-10', 'fan:hasOrderer');
ok(si1cust.length === 1 && si1cust[0] === 'fdata:Party/C1' && ordCust[0] === 'fdata:Party/C1',
  'coreference: SI1 ship-to is the SAME witnessed node as the orderer (fdata:Party/C1), across a 1-hop and 2-hop path');
ok(typesOf('fdata:Party/C1').filter((t) => t === 'fan:Party').length === 1,
  'coreference: fdata:Party/C1 is typed fan:Party exactly once (deduped, one node -- not two)');

// === DIVERGENT: SI9 -> fdata:Party/C2, a DISTINCT node ===
ok(objOf('fdata:ShipInfo/SI9', 'fan:hasShipToParty')[0] === 'fdata:Party/C2'
  && typesOf('fdata:Party/C2').includes('fan:Party'),
  'divergent: SI9 ship-to is a DISTINCT node fdata:Party/C2 (orderer C1 != ship-to C2)');

// === NON-EMISSION: SI2 (NULL hop) present + typed, NO hasShipToParty edge, NO marker of any kind ===
ok(typesOf('fdata:ShipInfo/SI2').includes('fan:ShipInfo'), 'non-emission: ShipInfo/SI2 SURVIVES (present + typed)');
ok(objOf('fdata:ShipInfo/SI2', 'fan:hasShipToParty').length === 0, 'non-emission: SI2 has NO hasShipToParty edge (accidental NULL -> nothing)');
ok(tt.filter((t) => t.s === 'fdata:ShipInfo/SI2').length === 1, 'non-emission: SI2 carries ONLY its own type triple -- no ICE, no marker (the optional relation is simply unfilled)');
ok(!tt.some((t) => String(t.s).includes('ice/SI2') || String(t.o).includes('ice/SI2') || String(t.s).includes('unresolved/SI2')),
  'non-emission: no ICE/UnresolvedRole node references SI2 (the v0.1.4 over-recording bug stays out of the live bytes)');

// === UNRESOLVED: SI3 (orphan 9999) -> UnresolvedRole re-seated off the fan: slot, reason broken-ref, NEVER typed Party; ShipInfo survives ===
ok(objOf('fdata:ShipInfo/SI3', 'fan:hasShipToParty').length === 0, 'unresolved: SI3 has NO fan:hasShipToParty edge (re-seated -- the #3 fix)');
const u = objOf('fdata:ShipInfo/SI3', 'fsdd:hasUnresolvedRole')[0];
ok(u && u.startsWith('fdata:unresolved/') && typesOf(u).includes('fsdd:UnresolvedRole'), 'unresolved: SI3 -> UnresolvedRole node via fsdd:hasUnresolvedRole (the broken deep ref is IN the graph, not dropped)');
ok(u && !typesOf(u).includes('fan:Party'), 'unresolved: NEVER typed fan:Party (the Traversal Invariant in the live bytes)');
ok(u && objOf(u, 'fsdd:reason')[0] === 'broken-ref' && objOf(u, 'fsdd:concernsType')[0] === 'fan:Party' && objOf(u, 'fsdd:role')[0] === 'fan:hasShipToParty',
  'unresolved: names its role (IRI) + concernsType + reason');
ok(typesOf('fdata:ShipInfo/SI3').includes('fan:ShipInfo'), 'unresolved: ShipInfo/SI3 SURVIVES (an accidental hop failure never invalidates the intermediary)');

// === DEDUPE-RETAINS-ALL-EDGES (the wiring pin): the merged ShipInfo node carries BOTH the star side (its type,
// exactly once; the order points to it) AND the snowflake side (its hasShipToParty edge). A dedupe that dropped an
// edge along with the duplicate type triple would fail here -- the silent-loss guard. ===
ok(typesOf('fdata:ShipInfo/SI1').filter((t) => t === 'fan:ShipInfo').length === 1, 'dedupe: ShipInfo/SI1 type triple appears EXACTLY once (collapsed, not lost, not doubled)');
ok(objOf('fdata:ActOfOrdering/ord-10', 'fan:hasShipInfo')[0] === 'fdata:ShipInfo/SI1', 'dedupe: the star-side order -> hasShipInfo -> SI1 edge is RETAINED');
ok(objOf('fdata:ShipInfo/SI1', 'fan:hasShipToParty')[0] === 'fdata:Party/C1', 'dedupe: the snowflake-side SI1 -> hasShipToParty -> C1 edge is RETAINED (both paths survive the merge -- no silent loss)');

// === SUBJECT-CONCEPT DIVERGENCE GUARD (correct-by-coincidence): the snowflake subject node is minted from the
// ADJUDICATED groundedConcept, not the declared entityClass -- so even if the adjudication sub-typed ShipInfo,
// the snowflake subject node === the star's node (dedupe + attachment stay correct). Synthetic divergence is the
// ONLY way to test it (real data coincides groundedConcept and entityClass). ===
{
  const one = [STAR_SAMPLES.snowflake.factRows[0]];                       // the SI1 (coreferent) case
  const r = JSON.parse(JSON.stringify(resolveStar(one)));
  r.results[0].dictionary['fsdd:hasField'].find((f) => f['fsdd:column'] === 'ship_info_key')['fsdd:groundedConcept']['@id'] = 'fan:ExpressShipInfo';
  const tt2 = materializeStarSnowflake(r, one).triples;
  ok(tt2.some((t) => t.s === 'fdata:ExpressShipInfo/SI1' && t.p === 'fan:hasShipToParty' && t.o === 'fdata:Party/C1'),
    'divergence guard: the hop attaches to the ADJUDICATED subject node (fdata:ExpressShipInfo/SI1), matching the star -- read from groundedConcept');
  ok(!tt2.some((t) => t.s === 'fdata:ShipInfo/SI1' && t.p === 'fan:hasShipToParty'),
    'divergence guard (negative): the hop does NOT attach to a declared-entityClass node the star never minted (correct-by-coincidence avoided)');
}

// === RESOLUTION-PANEL REPRESENTATION (the descent IS a resolution operation, so it is surfaced as hop
// RESOLUTIONS the SSM panel renders -- not only in the final graph). The four outcomes + the coreference flag are
// legible in the resolution layer; this gates that the demo depicts the snowflake resolution the hint advertises. ===
const hr = stages.ssm.hopResolutions || [];
ok(hr.length === 4 && stages.ssm.sampleSize === 4, 'resolution panel: 4 hop resolutions surfaced (one per order), sampleSize 4');
const byOrder = Object.fromEntries(hr.map((h) => [h.orderId, h]));
ok(byOrder[10] && byOrder[10].outcome === 'resolved' && byOrder[10].resolvedKey === 'C1' && byOrder[10].coreferent === true,
  'resolution panel: ord-10 hop resolved -> C1, flagged COREFERENT (ship-to = the orderer)');
ok(byOrder[11] && byOrder[11].outcome === 'resolved' && byOrder[11].resolvedKey === 'C2' && byOrder[11].coreferent === false,
  'resolution panel: ord-11 hop resolved -> C2, DISTINCT (not coreferent)');
ok(byOrder[12] && byOrder[12].outcome === 'absent', 'resolution panel: ord-12 hop absent (NULL) -> nothing');
ok(byOrder[13] && byOrder[13].outcome === 'dangling' && byOrder[13].reason === 'broken-ref', 'resolution panel: ord-13 hop dangling broken-ref -> UnresolvedRole');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
