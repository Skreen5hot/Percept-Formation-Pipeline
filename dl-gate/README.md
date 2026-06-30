# Phase-0 OWL-DL gate (BFO/CCO conformance)

The deep conformance gate for the PFP materialized graphs. Asserts, over each live honesty-ladder ABox
(`clean` / `ice` / `orphan` / `snowflake`) merged with the signed TBoxes + the full CCO:

1. **(P)** the `fan:` + `fsdd:` TBox is in the OWL 2 DL profile (catches punning);
2. **(S)** no `fsdd:` gap-record sits in the object slot of any `fan:` object property (the global **#3** invariant);
3. **(C)** the merged graph is **consistent** with **0 unsatisfiable** classes under HermiT.

This is the check the BFO/CCO review prescribed: no deployed gate loaded ABox+TBox+CCO together, and ELK does
not exploit continuant/occurrent disjointness — which is how the ship-to inconsistency reached production.

## What's here
- `phase0-dl-gate.sh` — the gate (one ABox per run). Reads ROBOT's exit directly; uses the separate
  `merge -o → reason -i` path (the chained `merge|reason` pipeline misreports consistency — banked in the header).
- `tbox/actofordering_law.ttl` — the signed domain TBox (the re-grounding).
- `tbox/fsdd-consolidated.ttl` — the single consolidated `fsdd:` honesty-layer TBox.
- `run-dl-gate.sh` — emits all four ABoxes (via `docs/js/vendor/gm/test/gm.emit-sample.mjs`) and gates each.

## Run it locally
```bash
ROBOT_JAR=~/.cache/robot/robot.jar \
CCO_TTL=~/Downloads/CommonCoreOntologiesMerged.ttl \
bash dl-gate/run-dl-gate.sh
```
Expected: **all four ABoxes GREEN** (OWL-DL, #3-clean, consistent, 0 unsatisfiable).

## In CI
- **Every push:** the *fast* floor (`docs/js/vendor/gm/test/gm.dlfloor.test.mjs`, wired into `deploy-pages.yml`)
  runs the #3 structural lint + referential integrity in milliseconds — no reasoner.
- **Periodic / on-demand:** `.github/workflows/dl-gate.yml` runs this deep gate (weekly + manual). It downloads
  ROBOT and uses the **vendored** CCO (`vendor/cco/CommonCoreOntologiesMerged.ttl`) directly — the gate is
  self-contained, no external provisioning. CCO travels with the gate on purpose: the upstream "merged" release
  (v2.1) carries BFO only by reference (~77 `obo:BFO_` refs), while the gate needs the full BFO axiomatization
  (the `continuant ⟂ occurrent` disjointness, 960 refs) inline — so a URL to upstream would silently strip the
  very disjointness this gate exploits. Set the repo variable `CCO_TTL_URL` only to deliberately override CCO
  with a different merged-Turtle source.
