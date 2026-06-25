// RED-FIRST ACCEPTANCE for the Auditor -- the proof it is not vacuous. It must FLAG the pre-fix manifest (the
// exact artifact that shipped the honesty bug) and PASS the post-fix one. Plus a TEST-ADEQUACY meta-check:
// every ledger claim must have an asserting test in the smoke (the check that would have caught the original
// blind spot -- a suite green on structure/status that never asserted content). Runs IN the deploy gate, so a
// regression to a vacuous Auditor also denies the deploy.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { audit, completeness } from './auditor.mjs';
import { FSDD_LEDGER, FSDD_EXEMPT } from './claim-ledger.mjs';
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
const comp = completeness(stages.fsdd.result.dictionary, FSDD_LEDGER, FSDD_EXEMPT);
ok(comp.covered.includes('fsdd:datasetStatus') && comp.covered.includes('fsdd:hasField[].fsdd:role'), 'CAP-B mechanism: known claims register as covered');
ok(comp.uncovered.includes('fsdd:dictionaryVersion'), 'CAP-B mechanism: an uncovered assertion is reported, not silently passed');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
