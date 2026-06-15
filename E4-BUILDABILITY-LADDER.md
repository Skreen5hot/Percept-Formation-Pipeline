# E4 (SAS -> Binder, structural channel) — the buildability ladder

Authored and gated **by the pipeline's agents**, like E3. This records the climb.

| Rung | Proves | Agent | Result |
|---|---|---|---|
| **S-A** mechanical | well-formed + faithful | `agent.specification_writer.v1` | **PASS** — 4 reqs, all NEEDs covered, nothing invented |
| **S-B** independent realization | a different participant can partition it | `agent.planner.v1` | **ok** — 4-module plan, first try (conformant) |
| **S-C** scoped-slice build | the factory builds it green | developer agent + `CLIJudge`, Docker `--network=none` | **BUILT** — 4/4 modules, 25/25 tests, real composition |
| **FR-8** human intent | the spec means what you intended | **Aaron** | **SIGNED** (2026-06-15, `captures-intent`) |

**Current disposition: VERIFIED.** All four ceilings at VERIFIED. The FR-8 discharge (Composer
`discharge/v1`, local-authority "Aaron", 2026-06-15) is recorded in `E4-VERIFIED.json`. The SAS->Binder
structural-channel spec is closed at the strongest confidence tier.

## The decision the agent made
**Option A (pass-through).** SAS derives and forwards the Binder-required structural fields from the BIBSS
CISM it already holds, emitting them alongside its own semantic fields. The agent **rejected Option B**
(retarget the Binder to SAS's `viz:hasDataType`/`sas:structuralType`/`viz:consensusScore`) with a real
reason: those fields don't carry `typeDistribution`, cardinality, or a coded-identifier signal — all three
would be irrecoverably absent under B, leaving the Binder contract unsatisfiable without upstream
re-architecture.

The spec pins: the per-field structural record `{ fieldId, typeDistribution, cardinality:{nullable,
required}, isCodedIdentifier }`; a `MissingFieldError` that *names* the absent field (no silent defaulting);
join by `fieldId` string equality only; and the exact CISM derivations (`cardinality.nullable` =
`SchemaNode.nullable`; `cardinality.required` = matching `SchemaEdge.required` or false; `isCodedIdentifier`
iff `kind ∈ {coded, identifier, coded-identifier}`).

## What was built (the slice)
M1 `e4-types` ← M2 `sas-emitter` (the pass-through derivation); M3 `binder-validator` ← M4 `binder-joiner`.
The joiner imports the validator + the error type; M4's pinned test runs **emitter → validator → joiner**
end-to-end, so the slice exercises the whole seam. Built in `.mjs` (the spec is TypeScript; `--network=none`
can't `npm install tsc`; the slice encodes the same language-agnostic contract). 25/25 green.

## Finding worth recording (a real gate gap)
The S-C slice selector (`select_slice`) picks the deepest **integrator's** dependency closure = `{M1, M3,
M4}` — which **excludes M2 `sas-emitter`**, the highest-realization-risk module (the actual pass-through
derivation). M2 is a *cross-seam producer*: nothing downstream imports it, so the depends-on-closure
selector misses it (the caveat already flagged in `sc.py`). This firing built the **full plan** so M2 was
actually built and tested. **Hardening candidate:** the S-C slice should include high-risk producers, not
only the integrator closure — otherwise a producer-heavy spec could pass S-C without its riskiest module
ever being built.

Raw: `E4-SAS-BINDER-spec-writer.json`, `E4-SC-build.json`.
