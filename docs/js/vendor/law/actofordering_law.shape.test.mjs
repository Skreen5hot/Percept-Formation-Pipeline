// Law-shape pin for the BFO/CCO-remediated Act of Ordering (Workstream S0).
// RED-first against the STALE compiled law; GREEN after recompiling the SIGNED .ttl
// (actofordering_law-remediation-proposal.ttl) through the two w2fuel_compile.py fixes
// (CC1: read rcr:ownTime; CC2: cco:/bare-obo: prefixes). This pin is a FAITHFULNESS guard:
// it asserts the compiled law matches the signed logic, and it doubles as the S0
// verification of BOTH compiler fixes (ownTime field => CC1; cco:/obo: compaction => CC2).
import LAW from './actofordering_law.mjs';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  RED:', msg); fails++; } };

const F = LAW.frames?.['fan:ActOfOrdering'];
const roles = (F?.roles ?? []).map(r => r.role);
const rcr = LAW.rcr?.['fan:ActOfOrdering'] ?? {};
const P = LAW.properties ?? {};
const sub = LAW.subClassOf ?? {};
const classes = LAW.classes ?? [];

// --- #6 split: the orderer is the act's agent; the legacy customer kind/role is gone ---
ok(roles.includes('hasOrderer'), "ActOfOrdering has a 'hasOrderer' role");
ok(!roles.includes('hasCustomer'), "ActOfOrdering has NO 'hasCustomer' role (renamed)");
ok((rcr.constitutive ?? []).includes('fan:hasOrderer'), "rcr constitutive includes fan:hasOrderer");
ok(!(rcr.constitutive ?? []).includes('fan:hasCustomer'), "rcr constitutive excludes fan:hasCustomer");
ok(!classes.includes('fan:Customer'), "fan:Customer kind removed (replaced by fan:Party)");

// --- CC1: orderOccupies carries the act's OWN time (rcr:ownTime, not rcr:inherence) ---
ok(P['fan:orderOccupies']?.ownTime === true, "fan:orderOccupies.ownTime === true (CC1)");

// --- #1/#5/#6 the ship-to hop is a designation OF THE ICE, not has-agent on a region ---
ok(P['fan:hasShipToParty']?.domain === 'fan:ShipInfo', "hasShipToParty domain = fan:ShipInfo");
ok(P['fan:hasShipToParty']?.range === 'cco:ont00001017', "hasShipToParty range = cco:ont00001017 (Agent)");

// --- #4 role-as-kind re-grounding + CC2 compaction (cco:/obo:) ---
ok(classes.includes('fan:Party'), "fan:Party class present");
ok(classes.includes('fan:CustomerRole'), "fan:CustomerRole class present");
ok(classes.includes('fan:ShipInfo'), "fan:ShipInfo class present");
ok((sub['fan:Party'] ?? []).includes('cco:ont00001017'), "fan:Party subClassOf cco:ont00001017 (CC2 cco:)");
ok((sub['fan:CustomerRole'] ?? []).includes('obo:BFO_0000023'), "fan:CustomerRole subClassOf obo:BFO_0000023 (CC2 bare obo:)");
ok((sub['fan:ShipInfo'] ?? []).includes('cco:ont00000686'), "fan:ShipInfo subClassOf cco:ont00000686 (Designative ICE)");
ok((sub['fan:Product'] ?? []).includes('obo:BFO_0000040'), "fan:Product subClassOf obo:BFO_0000040 (relaxed)");

if (fails) { console.error(`\nLAW-SHAPE PIN: RED (${fails} failed)`); process.exit(1); }
console.log('LAW-SHAPE PIN: GREEN (signed Act-of-Ordering shape, CC1+CC2 verified)');
