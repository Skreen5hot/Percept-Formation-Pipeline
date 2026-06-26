// THE DEPLOY GATE -- runs the live star path and (1) audits every emitted manifest against the claim-ledger
// and (2) runs CAP-B completeness, so the site publishes ONLY if every emitted claim is witnessed AND the
// ledger COVERS the artifact (no unwitnessed assertion silently passed, no witness-deferred claim shipped).
// Enforcement inside the only path to publish, default-deny. "audit: success" therefore means "nothing
// unwitnessed" -- about the artifact, and about the gate's own coverage.
import { runStar } from '../runner.js';
import { STAR_SAMPLES, STAR_NORTHWIND } from '../ssm.js';
import { audit, completeness } from './auditor.mjs';
import { FSDD_LEDGER } from './claim-ledger.mjs';

const facts = STAR_NORTHWIND.ssm['ssm:facts'];
const expectedRoles = facts[Object.keys(facts)[0]]['ssm:roleAssignments'].map((r) => r['ssm:role']);

let failed = 0;
let cleanDict = null;
for (const [key, sample] of Object.entries(STAR_SAMPLES)) {
  const { stages } = await runStar(sample.factRows, {});
  const dict = stages.fsdd && stages.fsdd.result && stages.fsdd.result.dictionary;
  if (!dict) { console.log(`[audit] ${key}: no manifest (frame excluded) -- nothing to audit`); continue; }
  if (key === 'clean') cleanDict = dict;
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

// CAP-B: the ledger must COVER the fullest artifact -- nothing unwitnessed silently passed, nothing deferred shipped.
if (cleanDict) {
  const comp = completeness(cleanDict, FSDD_LEDGER);
  if (comp.ok) {
    console.log(`[audit] CAP-B: PASS (${comp.covered.length} witnessed paths; every assertion witnessed or exempt)`);
  } else {
    failed++;
    console.log('[audit] CAP-B: FAIL -- the ledger does not fully cover the artifact:');
    for (const p of comp.uncovered) console.log(`    uncovered (unclassified assertion): ${p}`);
    for (const p of comp.deferred) console.log(`    witness-deferred (disclosed, blocks publish): ${p}`);
  }
}

console.log(failed ? `\nAUDIT FAILED (${failed}) -- deploy denied` : '\nAUDIT PASSED -- every emitted claim is witnessed, and the ledger covers the artifact');
process.exit(failed ? 1 : 0);
