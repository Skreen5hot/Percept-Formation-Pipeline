#!/usr/bin/env bash
# Run the Phase-0 OWL-DL gate over EVERY live PFP honesty-ladder ABox (clean / ice / orphan / snowflake),
# using the vendored signed TBoxes. This is the heavy gate (ROBOT + HermiT + full CCO) -- the every-push
# protection is the fast DL FLOOR in deploy-pages.yml (docs/js/vendor/gm/test/gm.dlfloor.test.mjs); this is the
# periodic / on-demand deep check the BFO/CCO review prescribed (the reasoner exploits continuant/occurrent
# disjointness; the floor cannot).
#
# Requires in the environment (the gate's heavy deps): ROBOT_JAR (path to robot.jar) and CCO_TTL (path to
# CommonCoreOntologiesMerged.ttl). The TBoxes travel with the product (dl-gate/tbox/). Node must be on PATH.
#   ROBOT_JAR=~/.cache/robot/robot.jar CCO_TTL=~/Downloads/CommonCoreOntologiesMerged.ttl bash dl-gate/run-dl-gate.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export TBOX_LAW="${TBOX_LAW:-$HERE/tbox/actofordering_law.ttl}"
export TBOX_FSDD="${TBOX_FSDD:-$HERE/tbox/fsdd-consolidated.ttl}"

for v in ROBOT_JAR CCO_TTL; do
  [[ -n "${!v:-}" && -f "${!v}" ]] || { echo "DL-GATE SETUP ERROR: \$$v is unset or missing (${!v:-<unset>})"; exit 2; }
done

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
rc=0
for s in clean ice orphan snowflake; do
  if ! node "$ROOT/docs/js/vendor/gm/test/gm.emit-sample.mjs" "$s" > "$work/$s.ttl"; then
    echo "DL-GATE ERROR: emit failed for sample '$s'"; exit 2
  fi
  echo "==================== DL gate: star-$s ===================="
  bash "$HERE/phase0-dl-gate.sh" "$work/$s.ttl" || rc=1
done
[[ $rc -eq 0 ]] && echo "DL-GATE: ALL FOUR ABoxes GREEN" || echo "DL-GATE: at least one ABox RED (see above)"
exit $rc
