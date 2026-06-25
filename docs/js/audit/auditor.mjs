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
export function completeness(artifact, ledger, exempt = []) {
  const present = enumeratePaths(artifact);
  const covered = new Set(ledger.flatMap((c) => c.covers || []));
  const exemptSet = new Set(exempt);
  const uncovered = present.filter((p) => !covered.has(p) && !exemptSet.has(p));
  return {
    ok: uncovered.length === 0,
    present,
    covered: [...covered].sort(),
    uncovered,
  };
}
