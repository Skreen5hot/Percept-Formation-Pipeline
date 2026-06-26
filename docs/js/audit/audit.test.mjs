// RED-FIRST ACCEPTANCE for the Auditor -- the proof it is not vacuous. It must FLAG the pre-fix manifest (the
// exact artifact that shipped the honesty bug) and PASS the post-fix one. Plus a TEST-ADEQUACY meta-check:
// every ledger claim must have an asserting test in the smoke (the check that would have caught the original
// blind spot -- a suite green on structure/status that never asserted content). Runs IN the deploy gate, so a
// regression to a vacuous Auditor also denies the deploy.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { audit, completeness } from './auditor.mjs';
import { FSDD_LEDGER } from './claim-ledger.mjs';
import { runStar } from '../runner.js';
import { STAR_SAMPLES, STAR_NORTHWIND } from '../ssm.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const facts = STAR_NORTHWIND.ssm['ssm:facts'];
const expectedRoles = facts[Object.keys(facts)[0]]['ssm:roleAssignments'].map((r) => r['ssm:role']);
const ctx = { sourceKind: 'structured', expectedRoles };

// THE PRE-FIX SHIPPED MANIFEST (the bug, reconstructed from the live artifact): 4 fields, bibss/sas
// provenance, n/a fulfillment, no role/grounded-concept, spurious L2.
const PREFIX_BAD = {
  '@type': 'fsdd:SemanticDataDictionary',
  'fsdd:datasetStatus': 'succeeds',
  'fsdd:datasetTaint': 'L2',
  'fsdd:disputed': [],
  'fsdd:hasField': ['customer_key', 'product_key', 'order_date_key', 'order_id'].map((c) => ({
    '@type': 'fsdd:DataField', 'fsdd:column': c, 'fsdd:fulfillmentStatus': 'n/a',
    'fsdd:taintDerivation': ['bibss:distribution->L1', 'sas:consensus<1->L2'], 'fsdd:taintLevel': 'L2',
  })),
};
const bad = audit(PREFIX_BAD, ctx, FSDD_LEDGER);
ok(!bad.ok, 'Auditor FLAGS the pre-fix manifest (not vacuous)');
ok(bad.rulings.find((r) => r.id === 'PROV-1-no-phantom-stage' && !r.ok), 'pre-fix: PROV-1 catches the bibss/sas phantom provenance');
ok(bad.rulings.find((r) => r.id === 'FIELD-4-bound-roles-present' && !r.ok), 'pre-fix: FIELD-4 catches the dropped accidental roles');

// FIELD-5 is a DISTINCT failure mode -- a role present WITHOUT its grounded concept. The pre-fix manifest
// exhibits lost-semantics as ABSENT roles (FIELD-4's mode), not present-without-concept, so FIELD-5 needs its
// own fixture to prove it is non-vacuous (each claim proven by an artifact that exhibits its own failure).
const ROLE_NO_CONCEPT = {
  '@type': 'fsdd:SemanticDataDictionary', 'fsdd:datasetStatus': 'succeeds', 'fsdd:datasetTaint': 'L1', 'fsdd:disputed': [],
  'fsdd:hasField': [{ '@type': 'fsdd:DataField', 'fsdd:column': 'customer_key', 'fsdd:role': 'hasCustomer', 'fsdd:taintDerivation': ['structured-source:fk-resolved->L1'], 'fsdd:taintLevel': 'L1' }],
};
const rnc = audit(ROLE_NO_CONCEPT, { sourceKind: 'structured' }, FSDD_LEDGER);
ok(rnc.rulings.find((r) => r.id === 'FIELD-5-role-semantics-present' && !r.ok), 'FIELD-5 catches a role present WITHOUT its grounded concept (its own failure mode)');

// THE POST-FIX LIVE MANIFEST (clean star) -- must PASS every claim.
const { stages } = await runStar(STAR_SAMPLES.clean.factRows, {});
const good = audit(stages.fsdd.result.dictionary, ctx, FSDD_LEDGER);
ok(good.ok, 'Auditor PASSES the post-fix clean manifest' + (good.ok ? '' : ' -- violations: ' + JSON.stringify(good.violations)));

// TEST-ADEQUACY: every ledger claim-family has an asserting test in the smoke (the meta-check on the suite).
const here = dirname(fileURLToPath(import.meta.url));
const smoke = readFileSync(join(here, '..', 'vendor', 'ssm', 'test', 'capstone.smoke.mjs'), 'utf8');
ok(/bibss\|sas/.test(smoke) && /structured-source/.test(smoke), 'test-adequacy: smoke asserts provenance source (PROV-1/2)');
ok(/cf\.length === 10/.test(smoke), 'test-adequacy: smoke asserts field count incl. accidentals (FIELD-4)');
ok(/groundedConcept/.test(smoke), 'test-adequacy: smoke asserts role semantics (FIELD-5)');
ok(/datasetTaint.*L1/.test(smoke), 'test-adequacy: smoke asserts dataset taint level (TAINT-3)');

// CAP-A -- witnessed exceptions. A self-granted L4 (taint bumped with no witnessed dispute) is FLAGGED; a
// witnessed dispute (status 'disputed' + >=2 candidates) PASSES. The manifest cannot grant itself L4.
const SELF_GRANTED_L4 = {
  '@type': 'fsdd:SemanticDataDictionary', 'fsdd:datasetStatus': 'succeeds', 'fsdd:datasetTaint': 'L4', 'fsdd:disputed': [],
  'fsdd:hasField': [{ '@type': 'fsdd:DataField', 'fsdd:column': 'x', 'fsdd:taintDerivation': ['structured-source:fk-resolved->L1'], 'fsdd:taintLevel': 'L1' }],
};
ok(audit(SELF_GRANTED_L4, { sourceKind: 'structured' }, FSDD_LEDGER).rulings.find((r) => r.id === 'TAINT-3-dataset-witnessed' && !r.ok),
  'CAP-A: TAINT-3 flags a self-granted L4 (no witnessed dispute)');
const WITNESSED_L4 = {
  '@type': 'fsdd:SemanticDataDictionary', 'fsdd:datasetStatus': 'disputed', 'fsdd:datasetTaint': 'L4',
  'fsdd:disputed': [{ 'fsdd:candidates': [{ 'fsdd:frame': 'fan:ActOfSale' }, { 'fsdd:frame': 'fan:ActOfPurchase' }] }],
  'fsdd:hasField': [{ '@type': 'fsdd:DataField', 'fsdd:column': 'x', 'fsdd:taintDerivation': ['structured-source:fk-resolved->L1'], 'fsdd:taintLevel': 'L1' }],
};
ok(audit(WITNESSED_L4, { sourceKind: 'structured' }, FSDD_LEDGER).rulings.find((r) => r.id === 'TAINT-3-dataset-witnessed' && r.ok),
  'CAP-A: TAINT-3 passes a witnessed dispute (status disputed + >=2 candidates)');

// CAP-B mechanism -- completeness must report an assertion the ledger does not witness, never silently pass it.
// (The FSDD ledger is not yet COMPLETE: claims for the uncovered set await ratification. This proves the
// MECHANISM works, not CAP-B-ok; CAP-B is wired into the gate only once the ledger covers the artifact.)
// --- the EIGHT new claims, each proven on its OWN failure-mode fixture (RED-first; non-vacuous) ---
const cleanDict = stages.fsdd.result.dictionary;
const fired = (artifact, id, c = { sourceKind: 'structured' }) => audit(artifact, c, FSDD_LEDGER).rulings.find((r) => r.id === id && !r.ok);

// HASH-7 (load-bearing): tamper any content -> it no longer hashes to its asserted version.
const tampered = JSON.parse(JSON.stringify(cleanDict));
tampered['fsdd:hasField'][0]['fsdd:column'] = 'TAMPERED';
ok(fired(tampered, 'HASH-7-content-addressed', ctx), 'HASH-7 catches a tampered manifest (content no longer hashes to its version)');

// ICE-11 (load-bearing): an implicit entity asserting an observed instance (@id) where only a record should be.
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:hasField': [], 'fsdd:hasImplicitEntity': [{ '@id': 'inst:customer/123', 'fsdd:concernsType': { '@id': 'fan:Customer' } }] }, 'ICE-11-record-not-instance'),
  'ICE-11 catches an implicit entity that asserts an observed instance instead of a record');

// PROPSRC-13: a garbage proposalSource would corrupt the taint root it feeds.
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:hasField': [], 'fsdd:proposalSource': 'garbage' }, 'PROPSRC-13-recognized'),
  'PROPSRC-13 catches a garbage proposalSource (corrupts the taint derivation it feeds)');

// FULFILL-8: a verdict carried by a field with no role.
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:hasField': [{ 'fsdd:column': 'x', 'fsdd:fulfillmentStatus': 'fulfilled' }] }, 'FULFILL-8-recognized-consistent'),
  'FULFILL-8 catches a verdict on a field with no role');

// AXIOM-9: a verdict that cites no deciding axiom.
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:hasField': [{ 'fsdd:column': 'x', 'fsdd:role': 'hasCustomer', 'fsdd:fulfillmentStatus': 'fulfilled' }] }, 'AXIOM-9-verdict-cites-axiom'),
  'AXIOM-9 catches a verdict with no deciding axiom');

// TAINTLVL-10: a taintLevel that exceeds what its own derivation witnesses.
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:proposalSource': 'deterministic', 'fsdd:hasField': [{ 'fsdd:column': 'x', 'fsdd:taintDerivation': ['structured-source:fk-resolved->L1'], 'fsdd:taintLevel': 'L4' }] }, 'TAINTLVL-10-level-matches-derivation'),
  'TAINTLVL-10 catches a taintLevel that exceeds its derivation');

// LAW-12: a field law absent from adjudicatedAgainst (inconsistent citation).
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:adjudicatedAgainst': [{ 'fsdd:lawHash': 'sha256:aaa' }], 'fsdd:hasField': [{ 'fsdd:column': 'x', 'fsdd:adjudicatingLaw': { 'fsdd:lawHash': 'sha256:bbb' } }] }, 'LAW-12-cited-law-consistent'),
  'LAW-12 catches a field law absent from adjudicatedAgainst');

// REVIEW-14: requiresReview=true without the binder review taint that must witness it.
ok(fired({ '@type': 'fsdd:SemanticDataDictionary', 'fsdd:hasField': [{ 'fsdd:column': 'x', 'fsdd:requiresReview': true, 'fsdd:taintDerivation': ['structured-source:fk-resolved->L1'], 'fsdd:taintLevel': 'L1' }] }, 'REVIEW-14-flag-taint-consistent'),
  'REVIEW-14 catches requiresReview=true with no witnessing review taint');

// --- CAP-B: the ledger fully covers the artifact; the third bucket blocks + discloses; gaps are found ---
const compClean = completeness(cleanDict, FSDD_LEDGER);
ok(compClean.ok && compClean.uncovered.length === 0 && compClean.deferred.length === 0,
  'CAP-B: the ledger fully covers the artifact (uncovered + deferred empty)' + (compClean.ok ? '' : ' -- ' + JSON.stringify(compClean.uncovered || compClean.errors)));
const noStatus = { ...FSDD_LEDGER, claims: FSDD_LEDGER.claims.filter((c) => c.id !== 'STATUS-6-recognized') };
const compDeferred = completeness(cleanDict, { ...noStatus, deferred: ['fsdd:datasetStatus'] });
ok(!compDeferred.ok && compDeferred.deferred.includes('fsdd:datasetStatus') && !compDeferred.uncovered.includes('fsdd:datasetStatus'),
  'CAP-B third bucket: a witness-deferred assertion BLOCKS the gate AND is disclosed (not silently uncovered, not exempt)');
ok(completeness(cleanDict, noStatus).uncovered.includes('fsdd:datasetStatus'),
  'CAP-B: an unclassified assertion is reported as uncovered, never silently passed');

// --- G-1/G-2 STRUCTURAL: the engine REFUSES a ledger that violates the contracts -- the violations are
// UNEXPRESSIBLE, not merely discouraged. This is what moves CAP-A/CAP-B from discipline to structure. ---
const selfGranted = { claims: [{ id: 'X', covers: [], check: () => ['fail'], exception: { when: () => true } }], exempt: [], deferred: [] };
ok(audit({}, {}, selfGranted).ledgerInvalid === true,
  'G-1 structural: a self-granted exception (when, no witness) makes the ledger INVALID -- a self-granted exception is unexpressible');
const unreasoned = { claims: [], exempt: [{ path: 'fsdd:foo' }], deferred: [] };
ok(completeness({}, unreasoned).ledgerInvalid === true,
  'G-2 structural: an exempt with no recognized reason makes the ledger INVALID -- cannot exempt an assertion without naming why');
const doubled = { claims: [{ id: 'Y', covers: ['fsdd:bar'], check: () => [] }], exempt: [{ path: 'fsdd:bar', reason: 'echo' }], deferred: [] };
ok(audit({}, {}, doubled).ledgerInvalid === true,
  'G-2 structural: a path both witnessed and exempt makes the ledger INVALID -- incoherent classification refused');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
