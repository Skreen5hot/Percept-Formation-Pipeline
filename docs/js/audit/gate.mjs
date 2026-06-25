// THE DEPLOY GATE -- runs the live star path and audits every emitted manifest against the claim-ledger.
// Exits non-zero on any unwitnessed claim. This is the REQUIRED check the Pages deploy depends on
// (enforcement inside the only path to publish, default-deny) -- not a habit run beside it. If the emitted
// artifact would say something it cannot witness, the deploy does not happen.
import { runStar } from '../runner.js';
import { STAR_SAMPLES, STAR_NORTHWIND } from '../ssm.js';
import { audit } from './auditor.mjs';
import { FSDD_LEDGER } from './claim-ledger.mjs';

const facts = STAR_NORTHWIND.ssm['ssm:facts'];
const RA = facts[Object.keys(facts)[0]]['ssm:roleAssignments'];
const expectedRoles = RA.map((r) => r['ssm:role']);

let failed = 0;
for (const [key, sample] of Object.entries(STAR_SAMPLES)) {
  const { stages } = await runStar(sample.factRows, {});
  const dict = stages.fsdd && stages.fsdd.result && stages.fsdd.result.dictionary;
  if (!dict) { console.log(`[audit] ${key}: no manifest (frame excluded) -- nothing to audit`); continue; }
  // the clean sample resolves all roles; the ICE sample legitimately drops the null constitutive role, so
  // only the clean case asserts full role completeness (FIELD-4). Both must be honest about what they DO emit.
  const ctx = { sourceKind: 'structured', expectedRoles: key === 'clean' ? expectedRoles : undefined };
  const res = audit(dict, ctx, FSDD_LEDGER);
  if (res.ok) {
    console.log(`[audit] ${key}: PASS (${res.rulings.filter((r) => r.applicable).length} claims witnessed)`);
  } else {
    failed++;
    console.log(`[audit] ${key}: FAIL`);
    for (const v of res.violations) console.log(`    - ${v}`);
  }
}
console.log(failed ? `\nAUDIT FAILED (${failed} sample(s) emit unwitnessed claims) -- deploy denied` : '\nAUDIT PASSED -- every emitted claim is witnessed');
process.exit(failed ? 1 : 0);
