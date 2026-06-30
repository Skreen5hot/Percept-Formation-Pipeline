// S3 pin: the snowflake ship-to hop over the full snowflake sample. The hop is a DESIGNATION OF THE ICE
// (ship_info hasShipToParty -> consignee), never has-agent on a region. RED-first against the current emitter
// (no consignee co-type; the dangling hop record rides fan:hasShipToParty -- a #3 violation); GREEN after S3.
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStarSnowflake } from '../../../gm.js';

const rows = STAR_SAMPLES.snowflake.factRows;
const t = materializeStarSnowflake(resolveStar(rows), rows).triples;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  RED:', msg); fails++; } };
const has = (s, p, o) => t.some(x => x.s === s && x.p === p && x.o === o && !x.lit);
const typed = (s, cls) => has(s, 'rdf:type', cls);

const RECORD_TYPES = new Set(['fsdd:ImplicitEntityRecord', 'fsdd:UnresolvedRole', 'fsdd:ExcludedFrame', 'fsdd:ProjectionRecord']);
const recordNodes = new Set(t.filter(x => x.p === 'rdf:type' && RECORD_TYPES.has(x.o)).map(x => x.s));

// --- GLOBAL #3 invariant over the WHOLE snowflake graph (star + hops) ---
const viol = t.filter(x => x.p.startsWith('fan:') && recordNodes.has(x.o));
ok(viol.length === 0, `#3 clean across star+hops (found ${viol.length}: ${viol.map(v => v.p).join(',')})`);

// --- SI1 -> C1: coreferent with the orderer; consignee is fan:Party + cco:Organization ---
ok(has('fdata:ShipInfo/SI1', 'fan:hasShipToParty', 'fdata:Party/C1'), 'SI1 hasShipToParty -> fdata:Party/C1 (designates)');
ok(typed('fdata:Party/C1', 'fan:Party') && typed('fdata:Party/C1', 'cco:ont00001180'), 'consignee C1 a fan:Party + cco:Organization');
ok(has('fdata:ActOfOrdering/ord-10', 'fan:hasOrderer', 'fdata:Party/C1'), 'COREFERENCE: order-10 orderer === SI1 consignee (fdata:Party/C1)');

// --- SI9 -> C2: divergent ship-to; the hop MUST co-type C2 (it is never an orderer) ---
ok(has('fdata:ShipInfo/SI9', 'fan:hasShipToParty', 'fdata:Party/C2'), 'SI9 hasShipToParty -> fdata:Party/C2');
ok(typed('fdata:Party/C2', 'fan:Party') && typed('fdata:Party/C2', 'cco:ont00001180'), 'divergent consignee C2 a fan:Party + cco:Organization (emitted by the hop)');

// --- SI2 absent: no edge, no record ---
ok(!t.some(x => x.s === 'fdata:ShipInfo/SI2' && (x.p === 'fan:hasShipToParty' || x.p === 'fsdd:hasUnresolvedRole')), 'SI2 (absent) emits no ship-to edge or record');

// --- SI3 dangling: re-seated onto fsdd:hasUnresolvedRole, NOT fan:hasShipToParty ---
const u = 'fdata:unresolved/SI3-hasShipToParty';
ok(has('fdata:ShipInfo/SI3', 'fsdd:hasUnresolvedRole', u), 'SI3 fsdd:hasUnresolvedRole -> record (re-seated)');
ok(!t.some(x => x.s === 'fdata:ShipInfo/SI3' && x.p === 'fan:hasShipToParty'), 'SI3 has NO fan:hasShipToParty edge (the #3 fix)');
ok(typed(u, 'fsdd:UnresolvedRole'), 'SI3 record a fsdd:UnresolvedRole');
ok(has(u, 'fsdd:role', 'fan:hasShipToParty'), "SI3 record fsdd:role = IRI 'fan:hasShipToParty' (not the literal)");
ok(has(u, 'fsdd:aboutFrame', 'fdata:ShipInfo/SI3'), 'SI3 record fsdd:aboutFrame -> the ShipInfo it is about');

if (fails) { console.error(`\nS3 SNOWFLAKE-HOP PIN: RED (${fails} failed)`); process.exit(1); }
console.log('S3 SNOWFLAKE-HOP PIN: GREEN (designates-clean hop, coreferent + divergent consignees co-typed, dangling re-seated)');
