// THE AUDITOR -- the OCE for the factory's own artifacts. Given an emitted artifact + an audit context + a
// claim-ledger (the artifact-law), it returns a ruling: which claims are witnessed, which are not. It asserts
// nothing it cannot back, and it refuses (flags) any claim whose witness is absent. Generic over the ledger;
// the FSDD ledger is the first law it adjudicates.
export function audit(artifact, context, ledger) {
  const rulings = ledger.map((claim) => {
    if (claim.applies && !claim.applies(context)) {
      return { id: claim.id, applicable: false, ok: true, violations: [] };
    }
    const violations = claim.check(artifact, context) || [];
    return { id: claim.id, applicable: true, ok: violations.length === 0, violations };
  });
  return {
    ok: rulings.every((r) => r.ok),
    rulings,
    violations: rulings.flatMap((r) => r.violations),
  };
}

// Enumerate the distinct assertion property-paths present in an artifact. Top-level keys are their own path;
// array-of-object members (hasField, hasImplicitEntity, disputed) contribute 'key[].<memberKey>'. This is the
// surface the artifact ACTUALLY asserts -- CAP-B checks that surface against what the ledger answers for.
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

// CAP-B -- completeness is a finding. Every assertion the artifact makes must be EITHER witnessed by a claim
// (claim.covers) OR explicitly exempt (structural/echo). Anything in neither set is reported: the artifact
// claims something no ledger entry witnesses, so "audit: success" would silently overclaim its own scope.
// This is what makes the gate honest about what it does NOT check -- the failure one level up from a wrong claim.
// CAP-B with the THREE buckets. Every present assertion is WITNESSED (a claim's covers), EXEMPT (structural/
// echo), or WITNESS-DEFERRED (a known truth-claim not yet witnessed -- DISCLOSED, never absorbed into exempt).
// Anything in none of the three is `uncovered` (the silent omission). The gate denies on uncovered OR on any
// witness-deferred actually present: a publication gate cannot ship a known-unwitnessed claim, but it names it
// rather than hiding it. ok therefore means "nothing unwitnessed", which is what "audit: success" must mean.
export function completeness(artifact, ledger, exempt = [], deferred = []) {
  const present = enumeratePaths(artifact);
  const covered = new Set(ledger.flatMap((c) => c.covers || []));
  const exemptSet = new Set(exempt);
  const deferredSet = new Set(deferred);
  const uncovered = present.filter((p) => !covered.has(p) && !exemptSet.has(p) && !deferredSet.has(p));
  const deferredPresent = present.filter((p) => deferredSet.has(p));
  return {
    ok: uncovered.length === 0 && deferredPresent.length === 0,
    present,
    covered: [...covered].sort(),
    deferred: deferredPresent,   // disclosed: known truth-claims not yet witnessed (must be empty to publish)
    uncovered,                   // silent omissions: assertions in no bucket (must be empty to publish)
  };
}
