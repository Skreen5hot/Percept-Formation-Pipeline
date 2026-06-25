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
