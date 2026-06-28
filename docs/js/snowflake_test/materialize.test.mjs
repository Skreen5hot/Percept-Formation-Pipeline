import { assert } from './_assert.mjs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const has = (p) => existsSync(join(root, ...p.split('/')));
import { mapping, dimsData, cases, query, subjectRefTable, subjectConcept, factRoleAssignmentSample } from './snowflake_fixtures.mjs';
const T = (out) => out.triples;
const hasT = (out, s, p, o) => T(out).some(t => t.s === s && t.p === p && (o === undefined || t.o === o));
const typeOf = (out, node) => T(out).filter(t => t.s === node && t.p === 'rdf:type').map(t => t.o);
const objOf = (out, s, p) => T(out).filter(t => t.s === s && t.p === p).map(t => t.o);

// covers: §4 per-subject outcomes, §5 coreference, §6 worked shapes + P-extra-1/2/5/6
if (has('vendor/gm/src/materializeSnowflake.mjs')) {
  const { materializeHops } = await import('../vendor/gm/src/materializeSnowflake.mjs');
  const { entityIRI } = await import('../vendor/gm/src/iri.mjs');

  // hop-record builders matching the §3 traversal output (the S2 input contract; hand-built so S2 is testable alone)
  const resolvedHop = (key) => ({ role: 'hasCustomer', fkColumn: 'customer_key', refTable: 'customer_dim', concept: 'fan:Customer', nullable: true, outcome: 'resolved', resolvedKey: key });
  const absentHop   = ()   => ({ role: 'hasCustomer', fkColumn: 'customer_key', refTable: 'customer_dim', concept: 'fan:Customer', nullable: true, outcome: 'absent' });
  const danglingHop = (r)  => ({ role: 'hasCustomer', fkColumn: 'customer_key', refTable: 'customer_dim', concept: 'fan:Customer', nullable: true, outcome: 'dangling', reason: r });

  // === PIN 1 + §6a: resolved hop -> the intermediary SURVIVES (typed) + an edge to a witnessed customer node ===
  const r1 = materializeHops({ subjectConcept, subjectKey: 'SI1', hops: [resolvedHop('C1')] });
  assert(hasT(r1, 'fdata:ShipInfo/SI1', 'rdf:type', 'fan:ShipInfo'), 'PIN1: the intermediary ShipInfo survives as a typed node');
  assert(hasT(r1, 'fdata:ShipInfo/SI1', 'fan:hasCustomer', 'fdata:Customer/C1'), 'PIN1: the hop edge ship_info -> hasCustomer -> the witnessed customer node');
  assert(hasT(r1, 'fdata:Customer/C1', 'rdf:type', 'fan:Customer'), 'PIN1: the resolved hop entity is typed as its DERIVED concept');

  // === PIN 5 + P-extra-2: coreference BY CONSTRUCTION -- the ship-to node === the star's entityIRI mint ===
  const shipTo = objOf(r1, 'fdata:ShipInfo/SI1', 'fan:hasCustomer')[0];
  assert(shipTo === entityIRI('fan:Customer', 'C1'),
    'P-extra-2: the ship-to IRI === entityIRI(fan:Customer,C1) -- the SAME mint the star orderer uses (byte-identical, coreferent; not hand-rolled)');
  assert(shipTo === 'fdata:Customer/C1', 'PIN5: the coreferent path mints the SAME fdata:Customer/C1 node (witnessed coreference across path lengths)');
  const r1d = materializeHops({ subjectConcept, subjectKey: 'SI9', hops: [resolvedHop('C2')] });
  assert(objOf(r1d, 'fdata:ShipInfo/SI9', 'fan:hasCustomer')[0] === 'fdata:Customer/C2', 'PIN5: the divergent path mints a DIFFERENT node fdata:Customer/C2');

  // === PIN 2 (NON-EMISSION): absent NULL hop -> intermediary present, NO edge, NO marker of ANY kind ===
  const r2 = materializeHops({ subjectConcept, subjectKey: 'SI2', hops: [absentHop()] });
  assert(hasT(r2, 'fdata:ShipInfo/SI2', 'rdf:type', 'fan:ShipInfo'), 'PIN2: the intermediary ShipInfo SURVIVES (present + typed)');
  assert(objOf(r2, 'fdata:ShipInfo/SI2', 'fan:hasCustomer').length === 0, 'PIN2 NON-EMISSION: NO hasCustomer edge for an accidental NULL');
  assert(!T(r2).some(t => String(t.s).startsWith('fdata:ice/') || String(t.o).startsWith('fdata:ice/')),
    'PIN2 NON-EMISSION: NO ICE node of any kind (an accidental NULL is NOT an ICE -- the v0.1.4 over-recording bug)');
  assert(!T(r2).some(t => String(t.s).startsWith('fdata:unresolved/') || String(t.o).startsWith('fdata:unresolved/')),
    'PIN2 NON-EMISSION: NO UnresolvedRole node');
  assert(!T(r2).some(t => String(t.s).startsWith('fdata:Customer/') || String(t.o).startsWith('fdata:Customer/')),
    'PIN2 NON-EMISSION: NO customer entity node (no fabricated entity)');
  assert(T(r2).filter(t => t.s === 'fdata:ShipInfo/SI2').length === 1,
    'PIN2: the intermediary carries ONLY its own type triple -- the optional relation contributes nothing');

  // === PIN 3 + §6c + PIN 4: dangling hop -> UnresolvedRole, intermediary survives, NEVER typed as concernsType ===
  const r3 = materializeHops({ subjectConcept, subjectKey: 'SI3', hops: [danglingHop('broken-ref')] });
  assert(hasT(r3, 'fdata:ShipInfo/SI3', 'rdf:type', 'fan:ShipInfo'), 'PIN3: the intermediary SURVIVES (accidental-dangling does not exclude it)');
  const u = objOf(r3, 'fdata:ShipInfo/SI3', 'fan:hasCustomer')[0];
  assert(u && typeOf(r3, u).includes('fsdd:UnresolvedRole'), 'PIN3: dangling hop -> an UnresolvedRole node (the broken deep ref is IN the graph, not dropped)');
  assert(!typeOf(r3, u).includes('fan:Customer'), 'PIN4 NEGATIVE: the UnresolvedRole is NEVER typed fan:Customer (no entity created by a broken resolution -- the Traversal Invariant)');
  assert(hasT(r3, u, 'fsdd:concernsType', 'fan:Customer') && objOf(r3, u, 'fsdd:reason')[0] === 'broken-ref', 'PIN3: the UnresolvedRole names concernsType + reason');
  assert(objOf(r3, u, 'fsdd:role')[0] === 'hasCustomer', 'PIN3: the UnresolvedRole carries its structured fsdd:role');

  // === P-extra-1: the record IRI is namespace-separated from any witnessed entity IRI ===
  assert(u.startsWith('fdata:unresolved/') && !u.startsWith('fdata:Customer/'),
    'P-extra-1: the UnresolvedRole IRI lives in fdata:unresolved/, never the entity namespace (cannot coincidentally corefer with a real customer)');

  // === P-extra-6: the dangling reason passes through UNALTERED (synthetic temporal-nonoverlap, never hardcoded broken-ref) ===
  const r6 = materializeHops({ subjectConcept, subjectKey: 'SI7', hops: [danglingHop('temporal-nonoverlap')] });
  const u6 = objOf(r6, 'fdata:ShipInfo/SI7', 'fan:hasCustomer')[0];
  assert(objOf(r6, u6, 'fsdd:reason')[0] === 'temporal-nonoverlap',
    'P-extra-6: the materializer passes the RESOLVED dangling reason through (temporal-nonoverlap), never hardcodes broken-ref');

  // === P-extra-5: single declared level -- no hop edge has a sub-entity (the customer leaf) as its subject ===
  assert(!T(r1).some(t => String(t.s).startsWith('fdata:Customer/') && t.p.startsWith('fan:')),
    'P-extra-5: depth cap -- the customer (leaf) has NO outgoing hop edge (one declared level only)');

  // === DETERMINISM ===
  assert(JSON.stringify(r1) === JSON.stringify(materializeHops({ subjectConcept, subjectKey: 'SI1', hops: [resolvedHop('C1')] })), '§: deterministic');

  // === END-TO-END (traverse -> materialize) over the fixtures, once S1 is present ===
  if (has('vendor/ssm/src/snowflakeTraversal.mjs')) {
    const { traverse } = await import('../vendor/ssm/src/snowflakeTraversal.mjs');
    const e2e = (name, key) => materializeHops({ subjectConcept, subjectKey: key, hops: traverse({ subjectRefTable, subjectRow: cases[name].subjectRow, mapping, dimsData, query }) });
    assert(hasT(e2e('resolved_coreferent', 'SI1'), 'fdata:ShipInfo/SI1', 'fan:hasCustomer', 'fdata:Customer/C1'), 'E2E: traverse -> materialize resolves the full hop to the coreferent node');
    assert(objOf(e2e('absent', 'SI2'), 'fdata:ShipInfo/SI2', 'fan:hasCustomer').length === 0, 'E2E: the NULL hop materializes nothing (non-emission) end to end');
    const ed = e2e('dangling', 'SI3');
    assert(typeOf(ed, objOf(ed, 'fdata:ShipInfo/SI3', 'fan:hasCustomer')[0]).includes('fsdd:UnresolvedRole'), 'E2E: the orphan hop materializes an UnresolvedRole end to end');
  }
}
