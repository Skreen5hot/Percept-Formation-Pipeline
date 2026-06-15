# Percept-Formation-Pipeline — Harmonization & Build Recommendation

**Produced by:** the IntegratedAgent factory (Specification-Writer machinery, I-8)
**Date:** 2026-06-15
**Method (why you can trust this more than a read-through):** the recommendation is **gated by
buildability, not asserted** (I-8 — the factory's core discipline applied to specs). Every "buildable"
claim is tiered by *evidence*:
- **PROVEN** — the factory has actually built it (the strongest claim).
- **CLAIMED** — the spec reads buildable (mature, normative, testable) but has NOT yet been put through
  the buildability gate (S-A mechanical → S-B independent-planner realization → S-C an actual slice
  build). A CLAIMED spec is *not* trusted as buildable until proven — it is a hypothesis to test.
- **BLOCKED** — buildable in isolation, but the *end-to-end* path depends on something not yet present.

This is the I-6 ceiling honestly applied: "this reads mature" is a self-graded opinion until an
independent build realizes it. The portfolio is **not** merged into one spec — it is harmonized: how the
parts relate, where they overlap, what's missing, and the recommended order to realize them.

---

## 1. The pipeline (dependency DAG)

```
raw bytes
   │
   ▼
 SNP ──(cleaned string)──► BIBSS ──(CISM: structural types)──► SAS ──(viz:DatasetSchema: semantic types)──┐
                                                                                                          ▼
 DKNP ──(SemanticTokenList: morphology)───────────────────────────────────────────────────────────────► Binder
                                                                              (+ Fandaws scope, ontology/RCR)│
                                                                                                          ▼
                                                                            Binder ──(bind:BindingProposal)──► OCE ──(oce:SynthesisJudgment)──► ALS
                                                                                                          (+ W2Fuel-compiled ontology, RCR)
```
Deterministic everywhere **except the Binder** (the single fallible/conjectural step), which is firewalled
downstream by OCE (deterministic constitutive adjudication) and a commit gate. SNP and DKNP are
independent (parallelizable); BIBSS needs SNP's output shape; SAS needs BIBSS's CISM; Binder needs SAS +
DKNP; OCE needs the Binder's proposal. (Aaron added OCE on 2026-06-15, closing the prior critical gap.)

## 2. Per-spec assessment

| Spec | Ver | Maturity | Buildability | Internal deps | External deps (not in portfolio) |
|---|---|---|---|---|---|
| **SNP** | 1.3 Final | mature | **PROVEN** (factory-built 2026-06-15: rules + parse + normalize, 35/35 pinned tests green; `normalize` imports rules+parse — real composition; ~$0.50) | none | ECVE A.6/A.7 patterns — *bundled into SNP*, so no runtime dep |
| **DKNP** | 2.1 Normative | mature | **CLAIMED** | none | none |
| **BIBSS** | 1.3 Draft | mature | **PROVEN** (the IntegratedAgent factory built this 71KB spec to 15/15 modules with a working `infer()`, contained+judged — published as BIBS2 / BIBSS3) | (SNP output shape, data-flow only) | none |
| **SAS** | 2.0 + 2.1 addendum | mature (treat as ONE) | **CLAIMED** | BIBSS (CISM) | Fandaws (optional enrichment), SNP manifest (optional) |
| **Binder** | 1.0.0 Draft | mature draft; the *fallible* step | **CLAIMED (deterministic core); BLOCKED end-to-end** | SAS, DKNP, OCE | Fandaws scope, ontology + RCR (stubbable for the core) |
| **OCE** | 1.0.0 Draft | mature draft | **CLAIMED (deterministic core); BLOCKED end-to-end** | Binder proposal (input) | W2Fuel-compiled ontology (OWL 2 RL), RCR graph (stubbable for the core) |
| SAS Term Registry | 1.1 | mature ref doc | **N/A** (not code; a conformance oracle for SAS's 35 terms) | SAS | FBO v1.1 TBox |

## 3. Harmonization findings

- **Conflicts: NONE.** The portfolio is disciplined and cleanly layered — no two specs give contradictory
  rules for the same thing. (Notable: this is the well-behaved case; the predicted conflict-detector
  isn't the binding constraint here.)
- **Overlaps (intentional, not faults):**
  - **SAS v2.0 vs v2.1-addendum** — the addendum closes 6 normative gaps (8-rule registry, `sas:activeConfig`,
    test cases T-15..T-22, invariants P-10/P-11). **Treat v2.0+v2.1 as a single spec**; building against
    v2.0 alone fails 8 tests + 2 invariants.
  - **SNP §4.4 / BIBSS §7.1.2 empty-to-null** — both apply it; idempotent and stated; SNP pre-coalesces so
    BIBSS gets clean input. Harmless.
- **Gaps (external dependencies the END-TO-END pipeline needs; each holds the full pipeline at GATED,
  but does NOT block building the components in isolation with stubs):**
  - **Fandaws** (terminology + frame retrieval) — SAS (optional) and Binder (lexical channel) consume it.
  - **W2Fuel + ontology/RCR** (the compiled constitutive law) — OCE and Binder's frameFit channel consume it.
  - **ALS** (assertion layer, post-OCE) — the pipeline's terminal stage; out of this portfolio.
  - ECVE — *not* a gap at runtime (its patterns are bundled into SNP).

## 4. Build recommendation (confidence-tiered, phased)

**Phase 1 — independent, mature, no external runtime deps (start here):**
1. **SNP v1.3** and **DKNP v2.1** in parallel — pure, deterministic, self-contained. The cheapest, safest
   first builds, and the right place to *prove the buildability gate on real specs* (convert CLAIMED →
   PROVEN). Each has an explicit test contract (SNP §12, DKNP §9).
2. **BIBSS v1.3** — already **PROVEN** by this factory; re-verify under the gate if a fresh artifact is
   wanted, but its buildability is not in doubt.

**Phase 2 — depends on Phase 1:**
3. **SAS v2.0+v2.1** (after BIBSS) — build the base 8-rule path; Fandaws enrichment is optional. Verify
   against the **SAS Term Registry** (the conformance oracle: all 35 terms emitted).

**Phase 3 — the firewalled head of the pipeline (deterministic cores buildable now, with stubs):**
4. **Binder v1.0.0 deterministic core** — evidence assembly + the default deterministic ranker are
   buildable with stub Fandaws/ontology; the LLM proposer is an optional, separately-marked adapter.
5. **OCE v1.0.0 deterministic core** — the synthesis operation (§8.4 algorithm) is pure; buildable with a
   stub constitutive law. Its input is the Binder's `bind:BindingProposal` (pinned).

**Phase 4 — end-to-end (BLOCKED until external deps land):**
6. Wire Binder → OCE → ALS once **Fandaws**, the **W2Fuel-compiled ontology + RCR**, and **ALS** are
   present. Until then each component is provable in isolation; the *whole pipeline* honestly reads GATED.

## 5. The path from CLAIMED to PROVEN (next steps, I-8)

The recommendation above is **honest about its own confidence**. To make "buildable now" trustworthy
for the rest, put each through the buildability gate (the factory's S-C):
1. ~~**SNP**~~ — **DONE (2026-06-15)**: built green under the loop (3 modules, 35/35 pinned tests, real
   composition, ~$0.50). SNP is now PROVEN. **Method note for the rest:** build from the pinned
   acceptance tests *without* `--architect` — the architect can author an internal interface that
   conflicts with what the pinned tests pin (here it declared `stripCurrency -> {cleaned, artifacts}`
   vs the test's `-> string`, deadlocking the developer at the judge gate). With pinned tests, the tests
   are the contract; composition is carried by the plan scope + the no-reimplementation gate.
2. **DKNP** next (independent, mature) — same method.
3. **SAS** (after a BIBSS re-verify), against the Term Registry oracle.
4. **Binder core** and **OCE core** with stubbed externals.
As each is built green under containment, its row flips CLAIMED → PROVEN and the recommendation hardens
from a reasoned read into a realized fact. The end-to-end (Phase 4) stays GATED — correctly — until the
external law (Fandaws, W2Fuel/ontology/RCR) and ALS are supplied.

**Bottom line:** a coherent, well-layered pipeline with no conflicts, **two now-proven components
(BIBSS, SNP)**, three more that read buildable and should be *proven* by building (DKNP/SAS, then the
Binder/OCE cores), and a genuine end-to-end blocker that is external (the constitutive law + Fandaws +
ALS), not a flaw in the specs.
