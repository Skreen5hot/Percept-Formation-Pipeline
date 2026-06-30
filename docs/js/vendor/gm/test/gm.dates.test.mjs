// S7 pin: per-act fan:Date individuals + fan:dateValue. The signed Decision-D: M mints a DISTINCT fan:Date
// PER ACT (keyed by the act+role, NOT the calendar value -- closes the #G shared-Date co-temporality bug) and
// carries the source date via fan:dateValue (currently DROPPED). RED-first against the current shared
// fdata:Date/D-ORD mint with no dateValue; GREEN after S7.
import { resolveStar } from '../../../ssm.js';
import { materializeStar } from '../../../gm.js';

const CLEAN = { order_id: 1, customer_key: 'C1', product_key: 'P1', order_date_key: 'D-ORD', employee_key: 'E1', supplier_key: 'SUP1', shipper_key: 'SH1', ship_info_key: 'SI1', required_date_key: 'D-REQ', shipped_date_key: 'D-SHP' };
const rows = [CLEAN, { ...CLEAN, order_id: 9 }];   // TWO acts sharing the same date keys -> must NOT share a Date node
const t = materializeStar(resolveStar(rows), rows).triples;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  RED:', msg); fails++; } };
const has = (s, p, o) => t.some(x => x.s === s && x.p === p && x.o === o && !x.lit);
const typedLit = (s, p, val, dt) => t.some(x => x.s === s && x.p === p && x.o && typeof x.o === 'object' && x.o.value === val && x.o.datatype === dt);

const d1 = 'fdata:date/ord-1-orderOccupies', d9 = 'fdata:date/ord-9-orderOccupies';

// --- per-act distinct Date individuals (co-temporality fix) ---
ok(has('fdata:ActOfOrdering/ord-1', 'fan:orderOccupies', d1), 'ord-1 orderOccupies -> its OWN per-act Date node');
ok(has('fdata:ActOfOrdering/ord-9', 'fan:orderOccupies', d9), 'ord-9 orderOccupies -> its OWN per-act Date node');
ok(d1 !== d9 && t.some(x => x.s === d1 && x.p === 'rdf:type' && x.o === 'fan:Date') && t.some(x => x.s === d9 && x.p === 'rdf:type' && x.o === 'fan:Date'),
  'two acts with the SAME calendar key get DISTINCT Date nodes, each typed fan:Date (no forced co-temporality)');
ok(!t.some(x => x.s === 'fdata:Date/D-ORD' || x.o === 'fdata:Date/D-ORD'), 'the OLD shared fdata:Date/D-ORD node is GONE');

// --- each per-act Date carries its witnessed fan:dateValue ^^xsd:date ---
ok(typedLit(d1, 'fan:dateValue', '1996-07-04', 'xsd:date'), 'ord-1 orderOccupies Date carries fan:dateValue 1996-07-04^^xsd:date');
ok(typedLit('fdata:date/ord-1-requiredOccupies', 'fan:dateValue', '1996-08-01', 'xsd:date'), 'ord-1 requiredOccupies Date carries its DISTINCT dateValue 1996-08-01');
ok(typedLit('fdata:date/ord-1-shippedOccupies', 'fan:dateValue', '1996-07-10', 'xsd:date'), 'ord-1 shippedOccupies Date carries its DISTINCT dateValue 1996-07-10');

// --- each Date node reachable from EXACTLY one act ---
const incoming = (node) => t.filter(x => x.o === node && x.p.startsWith('fan:') && x.p.endsWith('Occupies')).map(x => x.s);
ok(new Set(incoming(d1)).size === 1, 'the ord-1 Date node is reachable from exactly ONE act');

if (fails) { console.error(`\nS7 PER-ACT-DATES PIN: RED (${fails} failed)`); process.exit(1); }
console.log('S7 PER-ACT-DATES PIN: GREEN (distinct per-act fan:Date + witnessed fan:dateValue)');
