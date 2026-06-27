// Data-layer verification of the star FUNCTIONAL layer: runStar() drives the stage callbacks correctly for
// each honesty-ladder sample, reusing the shared core. (Browser/DOM rendering is verified separately.)
import { runStar } from '../../../runner.js';
import { STAR_SAMPLES } from '../../../ssm.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

async function drive(factRows) {
  const calls = [];
  const cb = { onStageStart: (id) => calls.push(['start', id]), onStageDone: (id, st) => calls.push(['done', id, st]) };
  const out = await runStar(factRows, cb);
  const done = Object.fromEntries(calls.filter((c) => c[0] === 'done').map((c) => [c[1], c[2]]));
  return { out, done, order: calls.filter((c) => c[0] === 'done').map((c) => c[1]) };
}

// CLEAN: 9 roles resolve -> SUCCEEDS -> manifest emitted.
{
  const { done, order } = await drive(STAR_SAMPLES.clean.factRows);
  ok(JSON.stringify(order) === JSON.stringify(['ssm', 'binder', 'oce', 'fsdd', 'gm']), 'clean: stage order ssm->binder->oce->fsdd->gm (GM = the Transform/Load step)');
  ok(done.ssm.outcome === 'resolved' && done.ssm.roleResolutions.length === 9
    && done.ssm.roleResolutions.every((r) => r.note === 'resolved'), 'clean: 9 roles all resolved');
  ok(done.binder.status === 'done' && done.binder.proposal.roleBindings.length === 9, 'clean: convergence -> 9 role-bindings');
  ok(done.oce.status === 'done' && done.oce.verdict === 'SUCCEEDS', 'clean: shared OCE verdict SUCCEEDS');
  ok(done.fsdd.status === 'done' && done.fsdd.result.ok === true && typeof done.fsdd.result.canonical === 'string'
    && done.fsdd.result.dictionary['fsdd:datasetStatus'] === 'succeeds', 'clean: FSDD manifest emitted + canonical bytes');
}

// ICE: NULL constitutive order_date -> absent -> manifest with the constitutive role empty.
{
  const { done } = await drive(STAR_SAMPLES.ice.factRows);
  ok(done.ssm.outcome === 'absent', 'ice: outcome absent');
  const od = done.ssm.roleResolutions.find((r) => r.fkColumn === 'order_date_key');
  ok(od && od.note === 'null' && od.role === 'orderOccupies', 'ice: order_date (orderOccupies) marked null');
  ok(done.oce.status === 'done' && /INCOMPLETE/.test(done.oce.verdict), 'ice: shared OCE verdict INCOMPLETE');
  ok(done.fsdd.status === 'done' && done.fsdd.result.ok === true, 'ice: degraded manifest still emitted');
}

// ORPHAN: constitutive customer dangling -> whole-frame exclusion -> binder/oce gate, no artifact.
{
  const { done } = await drive(STAR_SAMPLES.orphan.factRows);
  ok(done.ssm.outcome === 'dangling', 'orphan: outcome dangling');
  const cust = done.ssm.roleResolutions.find((r) => r.fkColumn === 'customer_key');
  ok(cust && /excluded/.test(cust.note), 'orphan: customer marked frame-excluded');
  ok(done.binder.status === 'gate' && done.oce.status === 'gate', 'orphan: binder + oce gated (no proposal)');
  ok(done.fsdd.status === 'stopped' && done.fsdd.result.ok === false, 'orphan: no artifact (frame excluded)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
