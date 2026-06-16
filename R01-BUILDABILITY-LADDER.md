# R0.1 cheap-win patches (fieldId / E2 / E5) — the buildability ladder

The three cheap-win reconciliation directives (`RECONCILIATION-PATCHES-R0.1.md`) taken up the same I-8
ladder as E3/E4. Because these are cross-component *directives* rather than a single artifact, the
buildable realization is an **executable seam-conformance kit**: helpers + validators encoding each rule,
so any pipeline component can be checked against them. Building the kit proves the patches are concrete
enough to implement and enforce.

| Rung | Agent | Result |
|---|---|---|
| **S-A** | `agent.specification_writer.v1` | PASS — 4 reqs, faithful |
| **S-B** | `agent.planner.v1` | ok — partitioned (first try) |
| **S-C** | developer agent + `CLIJudge`, Docker `--network=none` | **BUILT** — 4/4 modules, 21/21 tests, real composition |
| **FR-8** | **you** | pending |

**Disposition: GATED** (VERIFIED-eligible). Only your FR-8 sign-off remains.

## The conformance kit (what was built)
- **M1 `field-token`** (FR-1) — `fieldToken(slug)='viz:field/'+slug`, `isFieldToken`, `slugOf`.
- **M2 `type-distribution`** (FR-2) — `CANONICAL_KEYS` (the 5-key set), `validateTypeDistribution` rejecting
  `boolean-encoded-string` / `nullCount` / any non-canonical key.
- **M3 `null-count`** (FR-3) — `nullCount(td)=td.null ?? 0` (reads `typeDistribution.null`, never a
  `nullCount` field); composes M2's canon.
- **M4 `proposed-binding`** (FR-4) — `toProposedBinding`/`validateProposedBinding`: plain names, no `bind:`
  prefix, and every `roleBinding.fieldId` must be a canonical token; composes M1's `isFieldToken`.

21/21 green; `proposed-binding` imports `field-token` and `null-count` imports `type-distribution` (real
composition, verified). Raw: `RECONCILIATION-PATCHES-spec-writer.json`, `R01-SB-realization.json`,
`R01-SC-build.json`.

## Note
This run also exercised the just-shipped build-loop hardening: the fixed `select_slice` auto-selected all
four modules (the conformance kit is two sub-DAGs — `binding←fieldId` and `nullCount←typeDistribution` —
and the composing-producer fix correctly pulled the second sub-DAG in, with its dependency closure).
