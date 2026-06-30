// S6 pin: party co-typing + the orderer's CustomerRole layer, over the clean star sample.
// RED-first against the current emitter (party nodes carry only fan:Party, no cco: co-type, no role layer);
// GREEN after S6 emits the witnessed co-type for every party + the orderer's bearer-of/has-realization role.
// The NODE channel (these triples EXIST with correct cardinality) is load-bearing -- the DL gate's check C
// alone is satisfiable without them.
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStar } from '../../../gm.js';

const rows = STAR_SAMPLES.clean.factRows;
const t = materializeStar(resolveStar(rows), rows).triples;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  RED:', msg); fails++; } };
const has = (s, p, o) => t.some(x => x.s === s && x.p === p && x.o === o && !x.lit);
const typed = (s, cls) => has(s, 'rdf:type', cls);

const ORD = 'fdata:Party/C1', EMP = 'fdata:Party/E1', SUP = 'fdata:Party/SUP1', SHP = 'fdata:Party/SH1';
const FRAME = 'fdata:ActOfOrdering/ord-1';

// --- every party node: fan:Party (bearer) + its WITNESSED co-type ---
for (const p of [ORD, EMP, SUP, SHP]) ok(typed(p, 'fan:Party'), `${p} a fan:Party`);
ok(typed(ORD, 'cco:ont00001180'), `${ORD} co-typed cco:ont00001180 (Organization)`);
ok(typed(SUP, 'cco:ont00001180'), `${SUP} co-typed cco:ont00001180 (Organization)`);
ok(typed(SHP, 'cco:ont00001180'), `${SHP} co-typed cco:ont00001180 (Organization)`);
ok(typed(EMP, 'cco:ont00001262'), `${EMP} co-typed cco:ont00001262 (Person)`);

// --- the ORDERER bears a CustomerRole whose realizing act is THIS act (canonical participation + role pattern) ---
const roleNode = 'fdata:role/ord-1-hasOrderer';
ok(has(ORD, 'obo:BFO_0000196', roleNode), 'orderer obo:BFO_0000196 (bearer-of) the CustomerRole');
ok(typed(roleNode, 'fan:CustomerRole'), 'role node a fan:CustomerRole');
ok(has(roleNode, 'obo:BFO_0000054', FRAME), 'CustomerRole obo:BFO_0000054 (has-realization) the act');

// --- the redline restriction: NO OTHER party asserts a role layer (bearer-of/has-realization) ---
const bearerEdges = t.filter(x => x.p === 'obo:BFO_0000196');
ok(bearerEdges.length === 1 && bearerEdges[0].s === ORD, `only the orderer bears a role (found ${bearerEdges.length} bearer-of edges)`);

// --- non-party relata must NOT acquire a party co-type ---
ok(!typed('fdata:Product/P1', 'cco:ont00001180') && !typed('fdata:Date/D-ORD', 'cco:ont00001180'), 'product/date nodes get NO party co-type');

if (fails) { console.error(`\nS6 ROLE-LAYER PIN: RED (${fails} failed)`); process.exit(1); }
console.log('S6 ROLE-LAYER PIN: GREEN (party co-typing + orderer CustomerRole has-realization the act)');
