#!/usr/bin/env bash
# Phase-0 DL gate -- the verification floor for the FNSR perception pipeline.
#
# Asserts three things over (ABox + fan: TBox + fsdd: grounding + CCO-importing-BFO-2020):
#   (P) the merged graph is in the OWL 2 DL profile  -- catches punning (e.g. a term declared both
#       owl:ObjectProperty and owl:AnnotationProperty if the WAS- and grounding fsdd files are co-loaded);
#   (S) NO fsdd: gap-record sits in the OBJECT slot of ANY fan: object property -- the GLOBAL #3 invariant,
#       a STRUCTURAL lint that ALSO catches the latent/dangling case a reasoner misses (OWL treats an
#       undefined property as fresh with no range, so the live snowflake's broken-ref edge passes `reason`
#       but is still a re-seating violation that arms the moment M switches to the ranged fan:hasShipToParty);
#   (C) the merged graph is CONSISTENT with ZERO unsatisfiable classes under HermiT (OWL-DL).
#
# This is the gate the BFO/CCO review prescribed (REVIEW.md): none of M's deployed gates loads ABox+TBox
# together, and ELK does not exploit continuant/occurrent disjointness -- which is why the ship-to
# inconsistency reached production. Pair it with the referential-integrity linter (Gate F) for dangling
# fan:/perf: references, which a DL reasoner cannot see.
#
# HONEST EXPECTED STATE: RED on the CURRENTLY-PUBLISHED star-ice (a hard #3 clash now) and on snowflake
# (caught by check S today; by check C once M emits the ranged fan:hasShipToParty) until Workstream S lands
# the re-seating AND the fsdd: grounding ships together. That RED is correct -- it is the trap the review found.
#
# Exit: 0 = GREEN. 1 = RED (#3 lint or inconsistency/unsat). 2 = profile violation or gate/setup error.
# Reads ROBOT's OWN exit code directly (the 2>&1 is inside a $(...) substitution, not a pipe -- so $? is
# ROBOT's, not a tail's: the pipe-exit trap that masks exit codes is avoided).
#
# GOTCHA (banked): this gate does `merge -o <file>` THEN `reason -i <file>` as SEPARATE steps -- NOT a chained
# `merge ... reason` pipeline. ROBOT's chained merge|reason has been observed to report a misleading exit 0 /
# "consistent" on an input that the separate path correctly flags INCONSISTENT (seen on star-ice). Anyone
# re-verifying these proofs MUST use the separate merge-to-file then reason-from-file path, as the gate does.

set -uo pipefail

ROBOT="${ROBOT_JAR:-tools/robot.jar}"
CCO="${CCO_TTL:-vendor/cco/CommonCoreOntologiesMerged.ttl}"
TBOX_LAW="${TBOX_LAW:-bfo-cco-review-package/actofordering_law-remediation-proposal.ttl}"
TBOX_FSDD="${TBOX_FSDD:-bfo-cco-review-package/fsdd-consolidated.ttl}"   # the SINGLE consolidated fsdd TBox (do NOT also pass the WAS tbox/fsdd-vocabulary.ttl nor the grounding-proposal -> punning)

abox="${1:-}"
if [[ -z "$abox" ]]; then
  echo "usage: $0 <abox.ttl>    # override via env: ROBOT_JAR, CCO_TTL, TBOX_LAW, TBOX_FSDD"
  exit 2
fi
for f in "$ROBOT" "$CCO" "$TBOX_LAW" "$TBOX_FSDD" "$abox"; do
  [[ -f "$f" ]] || { echo "GATE ERROR: missing input '$f'"; exit 2; }
done

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
merged="$work/merged.ttl"; reasoned="$work/reasoned.ttl"
unsat="$work/unsat.txt"; profile="$work/profile.txt"; lint="$work/lint.csv"

# ---- merge ABox + TBoxes + CCO ----
if ! java -jar "$ROBOT" merge -i "$abox" -i "$TBOX_LAW" -i "$TBOX_FSDD" -i "$CCO" -o "$merged"; then
  echo "GATE ERROR: merge failed for '$abox'"; exit 2
fi

# ---- (P) OWL 2 DL profile of OUR layer (catches punning / OWL-Full in fan:+fsdd:) ----
# NB: validate-profile is run over the TBoxes ALONE (no CCO): vendored CCO itself trips validate-profile
# (it declares rdfs:altLabel as an annotation property -> "reserved vocabulary"), so profiling the full
# CCO merge would false-RED everything. Punning (the risk here -- e.g. co-loading the WAS-vocabulary's
# `concernsType a owl:ObjectProperty` with this file's AnnotationProperty redeclaration) is a TBox-level
# defect, fully visible without CCO.
ourtbox="$work/ourtbox.ttl"
if java -jar "$ROBOT" merge -i "$TBOX_LAW" -i "$TBOX_FSDD" -o "$ourtbox" >/dev/null 2>&1; then
  java -jar "$ROBOT" validate-profile --profile DL -i "$ourtbox" --output "$profile" >/dev/null 2>&1 || true
  if grep -qi 'NOT in profile' "$profile" 2>/dev/null; then
    echo "GATE: RED (profile) -- the fan:+fsdd: TBox is NOT in OWL 2 DL (punning / OWL-Full):"
    grep -iE 'pun|reserved|violation' "$profile" | head -20
    exit 2
  fi
fi

# ---- (S) structural #3 lint: no fsdd record in a fan: object slot ----
cat > "$work/lint.rq" <<'RQ'
PREFIX fsdd: <https://fnsr.dev/fsdd#>
SELECT ?subject ?fanProperty ?record WHERE {
  ?record a ?rt .
  VALUES ?rt { fsdd:ImplicitEntityRecord fsdd:UnresolvedRole fsdd:ExcludedFrame fsdd:ProjectionRecord }
  ?subject ?fanProperty ?record .
  FILTER( STRSTARTS(STR(?fanProperty), "https://fandaws.dev/concept/") )
}
RQ
if java -jar "$ROBOT" query -i "$merged" --query "$work/lint.rq" "$lint" >/dev/null 2>&1; then
  if [[ "$(wc -l < "$lint")" -gt 1 ]]; then
    echo "GATE: RED (#3) -- an fsdd: gap-record sits in the object slot of a fan: property (re-seat it onto fsdd:hasImplicitEntity/hasUnresolvedRole):"
    cat "$lint"
    exit 1
  fi
fi

# ---- (C) reason: consistency + unsatisfiable classes (HermiT, OWL-DL) ----
robot_out="$(java -jar "$ROBOT" reason --reasoner hermit \
      --equivalent-classes-allowed all --exclude-tautologies all \
      -D "$unsat" -i "$merged" -o "$reasoned" 2>&1)"
rexit=$?
echo "$robot_out"

if [[ $rexit -eq 0 && -s "$reasoned" && ! -s "$unsat" ]]; then
  # rexit 0 already implies 0 unsatisfiable (ROBOT reason fails by default on unsat); the `! -s "$unsat"`
  # is belt-and-suspenders against a future ROBOT default change (the -D dump file is written only if unsat).
  echo "GATE: GREEN -- '$abox' is OWL-DL, #3-clean, consistent, 0 unsatisfiable classes."
  exit 0
fi
echo "GATE: RED (consistency) -- '$abox' is inconsistent or has unsatisfiable classes (robot exit $rexit)."
[[ -s "$unsat" ]] && { echo "--- unsatisfiable classes ---"; cat "$unsat"; }
exit 1
