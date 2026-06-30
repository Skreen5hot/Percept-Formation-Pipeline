// S1 mapping-shape pin: the BFO/CCO-remediated SSM mapping source (ssm.js + gm.js).
// RED-first against the stale 'hasCustomer'/'fan:Customer' mapping; GREEN after S1.
// The LOAD-BEARING assertion is the groundedConcept flow: changing customer_dim entityClass to
// fan:Party must make the dictionary's groundedConcept for customer_key === 'fan:Party', because
// the materializer types the orderer node from groundedConcept (materialize.mjs:72-75) -- so this
// pin proves the orderer node WILL be typed fan:Party (the actual graph effect), not just that a
// label changed. integrate() must still resolve (binder leniency: a concept-fit DISAGREE never
// flips 'resolved').
import { STAR_NORTHWIND, resolveStar } from './ssm.js';
import { M_MAPPING } from './gm.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  RED:', msg); fails++; } };

const dims = STAR_NORTHWIND.ssm['ssm:dimensions'];
const orderer = M_MAPPING.roles.find(r => r.column === 'customer_key');

// --- the orderer role + concept (act subject = process => has-agent-clean) ---
ok(orderer?.role === 'hasOrderer', "customer_key role === 'hasOrderer'");
ok(orderer?.concept === 'fan:Party', "customer_key concept === 'fan:Party'");
ok(!M_MAPPING.roles.some(r => r.role === 'hasCustomer'), "no 'hasCustomer' role remains");

// --- all party dims collapse to fan:Party + carry their witnessed co-type (data for S6) ---
ok(dims.customer_dim['ssm:entityClass'] === 'fan:Party', "customer_dim entityClass === fan:Party");
ok(dims.supplier_dim['ssm:entityClass'] === 'fan:Party', "supplier_dim entityClass === fan:Party");
ok(dims.shipper_dim['ssm:entityClass'] === 'fan:Party', "shipper_dim entityClass === fan:Party");
ok(dims.employee_dim['ssm:entityClass'] === 'fan:Party', "employee_dim entityClass === fan:Party");
ok(dims.customer_dim['ssm:coType'] === 'cco:ont00001180', "customer_dim coType === cco:ont00001180 (Organization)");
ok(dims.supplier_dim['ssm:coType'] === 'cco:ont00001180', "supplier_dim coType === cco:ont00001180 (Organization)");
ok(dims.shipper_dim['ssm:coType'] === 'cco:ont00001180', "shipper_dim coType === cco:ont00001180 (Organization)");
ok(dims.employee_dim['ssm:coType'] === 'cco:ont00001262', "employee_dim coType === cco:ont00001262 (Person)");

// --- the snowflake hop is split off the act onto the ICE: ship_info -> hasShipToParty ---
const hop = (dims.ship_info['ssm:outgoingFKs'] || [])[0];
ok(hop?.['ssm:role'] === 'hasShipToParty', "ship_info outgoingFK role === 'hasShipToParty'");
ok(hop?.['ssm:refTable'] === 'customer_dim', "ship_info outgoingFK refTable stays customer_dim (hop concept = fan:Party)");

// --- LOAD-BEARING: integrate resolves AND the orderer's grounded type flows to fan:Party ---
const CLEAN = { order_id: 1, customer_key: 'C1', product_key: 'P1', order_date_key: 'D-ORD', employee_key: 'E1', supplier_key: 'SUP1', shipper_key: 'SH1', ship_info_key: 'SI1', required_date_key: 'D-REQ', shipped_date_key: 'D-SHP' };
const res = resolveStar([CLEAN]).results[0];
ok(res.outcome === 'resolved', "clean row resolves (binder not rejected)");
const fields = res.dictionary?.['fsdd:hasField'] || [];
const gc = fields.find(f => f['fsdd:column'] === 'customer_key')?.['fsdd:groundedConcept']?.['@id'];
ok(gc === 'fan:Party', `customer_key groundedConcept === 'fan:Party' (was '${gc}') -- the orderer node WILL type fan:Party`);

if (fails) { console.error(`\nS1 MAPPING-SHAPE PIN: RED (${fails} failed)`); process.exit(1); }
console.log('S1 MAPPING-SHAPE PIN: GREEN');
