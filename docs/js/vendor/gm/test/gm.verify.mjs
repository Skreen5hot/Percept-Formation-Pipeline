// OUTPUT-FIDELITY verification of the GM front (the Transform/Load step): runs M over the LIVE SSM front output
// (resolveStar -> materializeStar) for each honesty-ladder sample and asserts the faithfulness of the EMITTED
// GRAPH -- not that a graph was produced. This is the deploy-gate check for the materialized graph (spec
// graph-materialization v1.5 sec 8): loading is never the proof; the queries read the actual triples.
// BFO/CCO re-grounding: the orderer is fan:hasOrderer -> a fan:Party node; absent/broken gap-records re-seat
// onto fsdd:hasImplicitEntity / fsdd:hasUnresolvedRole (never a fan: slot, #3); fsdd:role is the property IRI.
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStar, M_MAPPING } from '../../../gm.js';
import { materialize } from '../src/materialize.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const project = (factRows) => materializeStar(resolveStar(factRows), factRows);
const CLEAN = STAR_SAMPLES.clean.factRows[0];
const ACCIDENTAL = [{ ...CLEAN, order_id: 5, shipper_key: 'NOPE' }];          // accidental-broken -> UnresolvedRole
const DOUBLE = [{ ...CLEAN, order_id: 4, customer_key: 'C-ORPHAN', product_key: 'P-GONE' }]; // two constitutive danglers

// helpers over a {triples} graph
const typesOf = (tt, n) => tt.filter((t) => t.s === n && t.p === 'rdf:type').map((t) => t.o);
const concernsOf = (tt, n) => (tt.find((t) => t.s === n && t.p === 'fsdd:concernsType') || {}).o;
const objOf = (tt, s, p) => tt.filter((t) => t.s === s && t.p === p).map((t) => t.o);

// === CLEAN: all 9 roles -> witnessed-identity nodes; ProjectionRecord present ===
{
  const { triples: tt } = project(STAR_SAMPLES.clean.factRows);
  const F = 'fdata:ActOfOrdering/ord-1';
  ok(objOf(tt, F, 'fan:hasOrderer')[0] === 'fdata:Party/C1'
    && typesOf(tt, 'fdata:Party/C1').includes('fan:Party'), 'clean: resolved hasOrderer -> witnessed-identity fdata:Party/C1 typed fan:Party');
  ok(objOf(tt, F, 'fan:hasEmployee')[0] === 'fdata:Party/E1', 'clean: resolved ACCIDENTAL role materializes too (no silent loss)');
  const proj = objOf(tt, F, 'fsdd:projectedBy')[0];
  ok(proj && typesOf(tt, proj).includes('fsdd:ProjectionRecord') && objOf(tt, proj, 'fsdd:sourceFsddHash')[0],
    'clean: frame carries a ProjectionRecord tying it to the source FSDD');
}

// === ICE (missing order_date): absent constitutive -> ICE re-seated off the fan: slot, NEVER typed as concernsType, carries fsdd:role IRI ===
{
  const { triples: tt } = project(STAR_SAMPLES.ice.factRows);
  ok(objOf(tt, 'fdata:ActOfOrdering/ord-2', 'fan:orderOccupies').length === 0, 'ice: NO record in the fan:orderOccupies slot (re-seated, #3)');
  const ice = objOf(tt, 'fdata:ActOfOrdering/ord-2', 'fsdd:hasImplicitEntity')[0];
  ok(ice && ice.startsWith('fdata:ice/') && typesOf(tt, ice).includes('fsdd:ImplicitEntityRecord'), 'ice: absent orderOccupies -> ImplicitEntityRecord node via fsdd:hasImplicitEntity');
  ok(!typesOf(tt, ice).includes(concernsOf(tt, ice)), 'ice: NEGATIVE -- the ICE is NOT typed as its concernsType (no fabricated fan:Date)');
  ok(objOf(tt, ice, 'fsdd:role')[0] === 'fan:orderOccupies', 'ice: the ICE carries its structured fsdd:role as the property IRI (sec 3a.1)');
}

// === ACCIDENTAL-BROKEN (shipper dangling): UnresolvedRole re-seated, NEVER typed, NEVER dropped, frame survives ===
{
  const { triples: tt } = project(ACCIDENTAL);
  ok(objOf(tt, 'fdata:ActOfOrdering/ord-5', 'fan:hasShipper').length === 0, 'accidental: NO record in the fan:hasShipper slot (re-seated, #3)');
  const u = objOf(tt, 'fdata:ActOfOrdering/ord-5', 'fsdd:hasUnresolvedRole')[0];
  ok(u && u.startsWith('fdata:unresolved/') && typesOf(tt, u).includes('fsdd:UnresolvedRole'), 'accidental: broken hasShipper -> UnresolvedRole node via fsdd:hasUnresolvedRole (present, not dropped)');
  ok(!typesOf(tt, u).includes('fan:Party') && objOf(tt, u, 'fsdd:reason')[0] === 'broken-ref', 'accidental: NEGATIVE -- not typed fan:Party; names reason broken-ref');
  ok(typesOf(tt, 'fdata:ActOfOrdering/ord-5').includes('fan:ActOfOrdering'), 'accidental: the frame SURVIVES (accidental-broken does not exclude it)');
}

// === EXCLUDED (orphan customer): NO valid frame; reason names every constitutive dangler ===
{
  const { triples: tt } = project(STAR_SAMPLES.orphan.factRows);
  ok(!tt.some((t) => t.p === 'rdf:type' && t.o === 'fan:ActOfOrdering'), 'orphan: NO valid fan:ActOfOrdering frame materialized');
  const x = tt.filter((t) => t.p === 'rdf:type' && t.o === 'fsdd:ExcludedFrame').map((t) => t.s)[0];
  ok(x && objOf(tt, x, 'fsdd:reason')[0] === 'dangling-constitutive:hasOrderer', 'orphan: ExcludedFrame reason names hasOrderer');
}
{
  const { triples: tt } = project(DOUBLE);
  const x = tt.filter((t) => t.p === 'rdf:type' && t.o === 'fsdd:ExcludedFrame').map((t) => t.s)[0];
  const reason = objOf(tt, x, 'fsdd:reason')[0] || '';
  ok(reason.includes('hasOrderer') && reason.includes('hasProduct'), 'double: ExcludedFrame reason names BOTH constitutive danglers (sec 3a.2 end-to-end)');
}

// === WITNESSED COREFERENCE: two orders by C1 -> the SAME node ===
{
  const { triples: tt } = project([CLEAN, { ...CLEAN, order_id: 9 }]);
  const c1 = objOf(tt, 'fdata:ActOfOrdering/ord-1', 'fan:hasOrderer')[0];
  const c9 = objOf(tt, 'fdata:ActOfOrdering/ord-9', 'fan:hasOrderer')[0];
  ok(c1 === 'fdata:Party/C1' && c9 === 'fdata:Party/C1', 'coreference: two orders by C1 reference the SAME witnessed node');
}

// === CONCEPT-FIDELITY (synthetic divergence -- the correct-by-coincidence guard): M reads the ADJUDICATED
// groundedConcept, never the mapping fallback. Real data coincides the two, so only synthetic divergence tests it. ===
{
  const resolved = resolveStar([CLEAN]);
  const r = JSON.parse(JSON.stringify(resolved.results[0]));
  r.dictionary['fsdd:hasField'].find((f) => f['fsdd:column'] === 'customer_key')['fsdd:groundedConcept']['@id'] = 'fan:VipCustomer';
  const out = materialize(r, M_MAPPING, CLEAN);
  const cust = out.triples.find((t) => t.p === 'fan:hasOrderer').o;
  ok(cust === 'fdata:VipCustomer/C1' && out.triples.some((t) => t.s === cust && t.p === 'rdf:type' && t.o === 'fan:VipCustomer'),
    'concept-fidelity: M emits the ADJUDICATED groundedConcept (fan:VipCustomer), not the mapping fallback (correct-by-coincidence guard)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
