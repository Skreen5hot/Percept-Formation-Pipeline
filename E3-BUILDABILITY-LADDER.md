# E3 (DKNP -> Binder) — the buildability ladder, all agent-driven

The E3 reconciliation spec was authored and gated **by the pipeline's agents**, not hand-authored. This
records how far up the I-8 buildability ladder it climbed.

| Rung | What it proves | Participant (agent) | Result |
|---|---|---|---|
| **S-A** mechanical | well-formed + faithful to the seam | `agent.specification_writer.v1` (`claude -p`) | **PASS** — 6 reqs, all NEEDs covered, nothing invented |
| **S-B** independent realization | a *different* participant can partition it into a buildable plan | `agent.planner.v1` (`claude -p`) | **ok** — 4-module plan, capability has a bearer (after one gate→feedback→retry) |
| **S-C** scoped-slice build | the factory actually builds it, green | `agent.developer` + `CLIJudge`, under Docker `--network=none` | **BUILT** — 4/4 modules, 26/26 tests, real composition |
| **FR-8** human intent | the spec means what you intended | **Aaron** | **SIGNED** (2026-06-15, `captures-intent`) |

**Current disposition: VERIFIED.** All four ceilings at VERIFIED
(`sa->VERIFIED sb->VERIFIED sc->VERIFIED human->VERIFIED`). The FR-8 discharge (Composer `discharge/v1`,
local-authority "Aaron", 2026-06-15) is recorded in `E3-VERIFIED.json`. The DKNP->Binder seam spec is
closed at the strongest confidence tier the factory issues.

## The S-C slice (what was built)

The slice is the deepest integrator **plus its closure** (D-1 — so the gate can't be a slice of easy
leaves): `M4 dknp-binder-adapter` ← `M3 analyzeTokens` ← `M2 markers` ← `M1 types`. The adapter
**imports and re-exports** `analyzeTokens` (composition, not reimplementation), so the slice genuinely
exercises the integration seam, not just leaf modules.

- Built in plain `.mjs` (the agent's spec is TypeScript; `--network=none` containment can't
  `npm install tsc`, so the slice encodes the *same* language-agnostic morphology + assembly contract).
- Pinned/source-only (VERIFIED-grade): the developer agent wrote **source only** against pre-seeded
  acceptance tests — the tests are the contract.
- Result: `M1..M4` gate=accepted, exec=passed; `26 passed, 0 failed`. Raw: `E3-SC-build.json`,
  `E3-SB-realization.json`.

## Honest caveats

- This is the **slice** of E3 (the integrator + closure), built once, green. It is strong evidence the
  spec is buildable — not a claim the full DKNP refactor is done.
- The agent's design choices (head-noun = last non-marker token; the closed 9-entry marker seed table)
  are now *built and tested*, but their real-world adequacy on messy field names is a separate question —
  the contract is proven, the lexicon will need tuning.
- One real defect was caught **by building**: on the first attempt the build silently fell back to
  test-authoring mode (the pinned tests weren't named after the module ids), and the developer authored a
  self-contradictory test that poisoned the suite. The exec tier caught it; the fix was a naming
  correction. The gate did its job.
