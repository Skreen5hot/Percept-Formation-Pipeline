// THE AUDITOR ENGINE -- the OCE for the factory's own artifacts, generalized so its honesty contracts are
// STRUCTURAL (the engine enforces them) rather than ledger-author discipline (a ledger remembers them).
// A LEDGER is { claims:[...], exempt:[{path, reason}], deferred:[path...] }.
// A CLAIM is { id, desc, covers:[path], applies?, check:(artifact,ctx)=>violations[],
//              exception?: { desc?, when:(artifact,ctx)=>bool, witness:(artifact,ctx)=>bool } }.
//
// G-1 (CAP-A structural): the engine OWNS the exception path. An exception is declared DATA -- a `when`
//   (the condition under which the base check may be excused) and a `witness` the ENGINE runs. A claim
//   cannot self-grant by returning [] from its check; the only way to express an exception is to name a
//   witness. validateLedger REFUSES a claim whose exception lacks a witness -- a self-granted exception is
//   unexpressible, not merely discouraged.
// G-2 (CAP-B structural): every artifact assertion must resolve to exactly one of {witnessed, exempt,
//   witness-deferred}. An EXEMPT entry must name a recognized structural REASON (you cannot exempt an
//   assertion without saying why it is not a truth-claim), and no path may be in two buckets. An
//   unclassified assertion is `uncovered` (a finding). validateLedger REFUSES an unreasoned exempt or a
//   double-classified path -- hiding an uncovered truth-claim in exempt is unexpressible.

const EXEMPT_REASONS = new Set(['structural', 'echo', 'sub-structure']);

export function enumeratePaths(artifact) {
  const paths = new Set();
  for (const [k, v] of Object.entries(artifact || {})) {
    paths.add(k);
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          for (const mk of Object.keys(item)) paths.add(`${k}[].${mk}`);
        }
      }
    }
  }
  return [...paths].sort();
}

// The engine refuses a malformed ledger, so CAP-A/CAP-B violations are UNEXPRESSIBLE. A ledger that fails
// validation can never pass audit() or completeness() -- the contracts are the engine's, not the author's.
export function validateLedger(ledger) {
  const errors = [];
  const claims = (ledger && ledger.claims) || [];
  const exempt = (ledger && ledger.exempt) || [];
  const deferred = (ledger && ledger.deferred) || [];
  const covered = new Set(claims.flatMap((c) => c.covers || []));

  for (const c of claims) {
    if (c.exception !== undefined && (typeof c.exception.when !== 'function' || typeof c.exception.witness !== 'function')) {
      errors.push(`claim ${c.id}: an exception must declare {when, witness} functions -- a self-granted exception (no engine-checked witness) is not expressible (CAP-A)`);
    }
  }
  const exemptPaths = new Set();
  for (const e of exempt) {
    if (!e || typeof e.path !== 'string') { errors.push(`exempt entry malformed: ${JSON.stringify(e)}`); continue; }
    if (!EXEMPT_REASONS.has(e.reason)) errors.push(`exempt '${e.path}': reason must be one of {${[...EXEMPT_REASONS].join(', ')}} -- cannot exempt an assertion without naming why it is not a truth-claim (CAP-B)`);
    if (covered.has(e.path)) errors.push(`path '${e.path}' is BOTH witnessed and exempt -- incoherent classification (CAP-B)`);
    exemptPaths.add(e.path);
  }
  for (const p of deferred) {
    if (covered.has(p)) errors.push(`path '${p}' is BOTH witnessed and witness-deferred -- incoherent (CAP-B)`);
    if (exemptPaths.has(p)) errors.push(`path '${p}' is BOTH exempt and witness-deferred -- incoherent (CAP-B)`);
  }
  return errors;
}

// G-1: the engine owns the exception. base check runs; on failure, if a declared exception's `when` holds,
// the base is excused ONLY if the engine-run `witness` passes -- otherwise the failure stands (and is named).
function evalClaim(claim, artifact, ctx) {
  if (claim.applies && !claim.applies(ctx)) return { id: claim.id, applicable: false, ok: true, violations: [] };
  const base = claim.check(artifact, ctx) || [];
  if (base.length === 0) return { id: claim.id, applicable: true, ok: true, violations: [] };
  if (claim.exception && claim.exception.when(artifact, ctx)) {
    if (claim.exception.witness(artifact, ctx)) return { id: claim.id, applicable: true, ok: true, violations: [], viaWitnessedException: true };
    return { id: claim.id, applicable: true, ok: false, violations: base.concat(`exception claimed (${claim.exception.desc || claim.id}) but its witness was not satisfied`) };
  }
  return { id: claim.id, applicable: true, ok: false, violations: base };
}

export function audit(artifact, context, ledger) {
  const errors = validateLedger(ledger);
  if (errors.length) return { ok: false, ledgerInvalid: true, errors, rulings: [], violations: errors };
  const rulings = (ledger.claims || []).map((c) => evalClaim(c, artifact, context));
  return { ok: rulings.every((r) => r.ok), rulings, violations: rulings.flatMap((r) => r.violations) };
}

// CAP-B: every present assertion is WITNESSED (a claim's covers), EXEMPT (reasoned structural/echo), or
// WITNESS-DEFERRED (a known truth-claim not yet witnessed -- disclosed, never absorbed into exempt). Anything
// in none is `uncovered`. The gate denies on uncovered OR any present witness-deferred. ok therefore means
// "nothing unwitnessed" -- about the artifact AND about the ledger's own coverage.
export function completeness(artifact, ledger) {
  const errors = validateLedger(ledger);
  if (errors.length) return { ok: false, ledgerInvalid: true, errors, present: [], covered: [], deferred: [], uncovered: [] };
  const present = enumeratePaths(artifact);
  const covered = new Set((ledger.claims || []).flatMap((c) => c.covers || []));
  const exemptSet = new Set((ledger.exempt || []).map((e) => e.path));
  const deferredSet = new Set(ledger.deferred || []);
  const uncovered = present.filter((p) => !covered.has(p) && !exemptSet.has(p) && !deferredSet.has(p));
  const deferredPresent = present.filter((p) => deferredSet.has(p));
  return { ok: uncovered.length === 0 && deferredPresent.length === 0, present, covered: [...covered].sort(), deferred: deferredPresent, uncovered };
}
