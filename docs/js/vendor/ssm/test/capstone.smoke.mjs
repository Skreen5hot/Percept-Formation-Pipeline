// PROOF-OF-REUSE smoke: the Phase-2 Northwind capstone assertions, run against the SSM front AS VENDORED
// INTO THE PFP REPO (docs/js/vendor/ssm) composing the SHARED docs/js/vendor/{oce,fsdd,binder}. If this is
// green, the star path reuses the demo's exact OCE/FSDD/Binder build (G-VENDOR) -- not a second copy.
import { integrate } from '../src/integrate.mjs';
import LAW from '../../law/actofordering_law.mjs';   // vendored as .mjs default (same JSON as the capstone law)

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL:', m); } };

const D = (bk) => ({ id: bk, businessKey: bk, content: {}, validFrom: '2024-01-01', validTo: null, assertedAt: '2024-01-01' });
const DIMS = {
  customer_dim: [D('C1')], product_dim: [D('P1')], employee_dim: [D('E1')], supplier_dim: [D('SUP1')],
  shipper_dim: [D('SH1')], ship_info: [D('SI1')], date_dim: [D('D-ORD'), D('D-REQ'), D('D-SHP')],
};
const RA = [
  { 'ssm:fkColumn': 'customer_key', 'ssm:refTable': 'customer_dim', 'ssm:role': 'hasOrderer' },   // #6 re-grounding: the orderer is the act's agent
  { 'ssm:fkColumn': 'product_key', 'ssm:refTable': 'product_dim', 'ssm:role': 'hasProduct' },
  { 'ssm:fkColumn': 'order_date_key', 'ssm:refTable': 'date_dim', 'ssm:role': 'orderOccupies' },
  { 'ssm:fkColumn': 'employee_key', 'ssm:refTable': 'employee_dim', 'ssm:role': 'hasEmployee' },
  { 'ssm:fkColumn': 'supplier_key', 'ssm:refTable': 'supplier_dim', 'ssm:role': 'hasSupplier' },
  { 'ssm:fkColumn': 'shipper_key', 'ssm:refTable': 'shipper_dim', 'ssm:role': 'hasShipper' },
  { 'ssm:fkColumn': 'ship_info_key', 'ssm:refTable': 'ship_info', 'ssm:role': 'hasShipInfo' },
  { 'ssm:fkColumn': 'required_date_key', 'ssm:refTable': 'date_dim', 'ssm:role': 'requiredOccupies' },
  { 'ssm:fkColumn': 'shipped_date_key', 'ssm:refTable': 'date_dim', 'ssm:role': 'shippedOccupies' },
];
const DIMDEFS = {
  customer_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'customer_key' },   // #4: all parties collapse to fan:Party (Agent bearer) + witnessed co-type
  product_dim: { 'ssm:entityClass': 'fan:Product', 'ssm:businessKey': 'product_key' },
  employee_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001262', 'ssm:businessKey': 'employee_key' },
  supplier_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'supplier_key' },
  shipper_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'shipper_key' },
  ship_info: { 'ssm:entityClass': 'fan:ShipInfo', 'ssm:businessKey': 'ship_info_key' },
  date_dim: { 'ssm:entityClass': 'fan:Date', 'ssm:businessKey': 'date_key' },
};
const SSM = { 'ssm:source': { 'ssm:systemName': 'northwind_dw' },
  'ssm:facts': { 'orders_fact': { 'ssm:recordConcept': 'fan:ActOfOrdering', 'ssm:roleAssignments': RA } },
  'ssm:dimensions': DIMDEFS };
const COLS = ['customer_key', 'product_key', 'order_date_key', 'employee_key', 'supplier_key', 'shipper_key', 'ship_info_key', 'required_date_key', 'shipped_date_key', 'order_id'];
const SCHEMA = { 'viz:rawInputHash': 'sha256:nw', 'viz:hasField': COLS.map((c) => ({ fieldId: `viz:field/${c}`, 'viz:fieldName': c })) };
const CISM = { fields: COLS.map((c) => ({ field: c, primitiveType: c === 'order_id' ? 'integer' : 'string', typeDistribution: { [c === 'order_id' ? 'integer' : 'string']: 1 } })) };
const SCOPE = { resolveTerm: () => [], getConcept: () => null, retrieveFrames: () => ['fan:ActOfOrdering'] };
const LEXIS = Object.fromEntries(COLS.map((c) => [`viz:field/${c}`, { head: c.replace(/_key$|_id$/, ''), markers: ['key'] }]));
const Q = { validInstant: '2024-06-01', assertionHorizon: '2026-01-01' };
const base = { ssm: SSM, dimsData: DIMS, law: LAW, scope: SCOPE, lexis: LEXIS, schema: SCHEMA, cism: CISM, envelope: { 'dcterms:title': 'Northwind DW' } };
const FULL = { order_id: 1, customer_key: 'C1', product_key: 'P1', order_date_key: 'D-ORD', employee_key: 'E1', supplier_key: 'SUP1', shipper_key: 'SH1', ship_info_key: 'SI1', required_date_key: 'D-REQ', shipped_date_key: 'D-SHP' };
const ice = (r) => (r && r.ice) ? r.ice : [];
const run = (rows) => integrate({ ...base, factRows: rows, query: Q }).results;

const clean = run([FULL])[0];
assert(clean && clean.outcome === 'resolved' && clean.dictionary && clean.dictionary['fsdd:datasetStatus'] === 'succeeds'
    && clean.roleDefects && clean.roleDefects.length === 0 && !clean.defect
    && (!clean.capMarkers || clean.capMarkers.length === 0),
  'clean 9-role star (date_dim x3 role-played) -> SUCCEEDS against the real law via the SHARED OCE/FSDD, no spurious defects');

// FIELD-CONTENT (the deploy-gate honesty check) -- the manifest must say TRUE things, not just produce output.
const cd = clean.dictionary;
const cf = cd['fsdd:hasField'] || [];
const byCol = Object.fromEntries(cf.map((f) => [f['fsdd:column'], f]));
assert(cf.length === 10, `field-content: all 9 roles + order_id present (got ${cf.length}) -- accidentals not dropped`);
assert(cf.every((f) => (f['fsdd:taintDerivation'] || []).every((s) => !/^(bibss|sas):/.test(s))),
  'provenance honesty (F1): NO field attributes taint to bibss/sas -- stages the star path never runs');
assert(cf.every((f) => (f['fsdd:taintDerivation'] || []).every((s) => /^structured-source:/.test(s))),
  'provenance (F1): every field carries structured-source (FK-resolution) provenance');
assert(cd['fsdd:datasetTaint'] === 'L1', 'taint level (F1): clean structured-source resolution is L1, not a spurious L2');
for (const [col, role, relatum, fulfilled] of [
  ['customer_key', 'hasOrderer', 'fan:Party', true], ['product_key', 'hasProduct', 'fan:Product', true], ['order_date_key', 'orderOccupies', 'fan:Date', true],
  ['employee_key', 'hasEmployee', 'fan:Party', false], ['supplier_key', 'hasSupplier', 'fan:Party', false], ['shipper_key', 'hasShipper', 'fan:Party', false],
  ['ship_info_key', 'hasShipInfo', 'fan:ShipInfo', false], ['required_date_key', 'requiredOccupies', 'fan:Date', false], ['shipped_date_key', 'shippedOccupies', 'fan:Date', false],
]) {
  const f = byCol[col];
  assert(f && String(f['fsdd:role']).includes(role) && f['fsdd:groundedConcept'] && f['fsdd:groundedConcept']['@id'] === relatum,
    `field ${col} (F3): carries role ${role} + relatum ${relatum}`);
  assert(f && (fulfilled ? f['fsdd:fulfillmentStatus'] === 'fulfilled' : f['fsdd:fulfillmentStatus'] === 'n/a'),
    `field ${col} (F2/F3): ${fulfilled ? 'constitutive FULFILLED' : 'accidental bound, n/a'}`);
}

const noOrderDate = run([{ ...FULL, order_date_key: null }])[0];
assert(noOrderDate && noOrderDate.outcome === 'absent' && ice(noOrderDate).length >= 1,
  'role-play constitutive: NULL order_date (orderOccupies) -> incomplete + ICE');

const noShipDate = run([{ ...FULL, shipped_date_key: null }])[0];
assert(noShipDate && noShipDate.outcome === 'resolved' && ice(noShipDate).length === 0 && !noShipDate.defect
    && noShipDate.roleDefects && noShipDate.roleDefects.length === 0,
  'role-play accidental: NULL shipped_date (shippedOccupies) -> resolves, NO ICE, NO false broken-ref');

const mixed = run([{ ...FULL, shipper_key: 'SH-ORPHAN', product_key: null }])[0];
assert(mixed && mixed.outcome === 'absent' && ice(mixed).length >= 1
    && mixed.roleDefects && mixed.roleDefects.length === 1 && String(mixed.roleDefects[0].role).includes('hasShipper'),
  'masking at 9-role: dangling accidental shipper + NULL constitutive product -> absent + 1 shipper roleDefect');

const orphanCust = run([{ ...FULL, customer_key: 'C-ORPHAN' }])[0];
assert(orphanCust && orphanCust.outcome === 'dangling' && orphanCust.defect && !orphanCust.dictionary,
  'override at scale: orphan customer (constitutive) excludes the whole frame; 8 healthy roles do not rescue');

assert(JSON.stringify(run([FULL])) === JSON.stringify(run([FULL])),
  'determinism on the real schema');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
