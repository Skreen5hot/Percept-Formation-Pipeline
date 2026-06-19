# Percept-Formation-Pipeline — Interface Reconciliation (Architect Review of the Seams)

**Produced by:** the IntegratedAgent factory (cross-spec architect review)
**Date:** 2026-06-15
**Supersedes the "zero conflicts" claim in HARMONIZATION-AND-BUILD-RECOMMENDATION.md §3.** That claim
was a *contradiction* check (do two specs state opposite rules — they don't). This is the *composition*
check it omitted: does each producer's **actual output** match each consumer's **actual input**? It does
**not**, at 4 of 5 seams, plus a systemic identity gap. **As uploaded, the pipeline does not compose
end-to-end without spec work.** Building a spec in isolation (SNP is PROVEN) proves the spec, NOT that
its seams connect.

---

## 0. The systemic finding: there is no shared `fieldId`

Every cross-field channel and binding must refer to a column by the **same identifier**, but the specs
each use a different one:

| Spec | How it names a field |
|---|---|
| BIBSS (CISM) | `SchemaEdge.name` + node `id` = RFC-6901 pointer (`#/Revenue`) |
| SAS (viz:DatasetSchema) | `viz:fieldName` (original) + `@id` = `viz:field/{slug}` (normalized, e.g. `viz:field/revenue`) |
| DKNP | `sourceIdentifier` (the raw identifier echoed) |
| Binder | `fieldId` — keys `lexis` by it AND reads `schema` by it; assumes SAS + DKNP agree on it |
| OCE | `roleBindings[].fieldId` = `viz:field/...` |

The Binder requires SAS's structural channel and DKNP's morphology channel to be **keyed identically**,
and OCE's `fieldId` to match. Today **none of these line up** (slug vs raw vs pointer). **Spec work #1
(unblocks the rest): adopt one canonical `fieldId` — recommend `viz:field/{slug}` — and require SAS,
DKNP-lexis, the Binder channels, and OCE roleBindings to all use it.**

---

## 1. Seam-by-seam diff

### E1. SNP → BIBSS  — **COMPATIBLE** ✓
- SNP emits `cleaned: string` (CSV w/ header, or JSON), with currency/dates/trailing-columns/BOM/
  empty-to-null already done. BIBSS.infer() takes exactly `string`, and its "clean input" assumption
  (§2.5) names exactly those caller responsibilities. The handshake holds.
- Minor (not a blocker): SNP's `manifest`/`diagnostics` and its BigInt flag are a **side channel** SNP
  emits but BIBSS does not read (BIBSS gets only `cleaned`). BIBSS re-derives BigInt via its own
  ≤MAX_SAFE_INTEGER rule. The manifest is consumed by **SAS** (optionally), not BIBSS — fine.

### E2. BIBSS → SAS  — **MISMATCH** ✗ (two real gaps)
SAS consumes the CISM directly and "unconditionally trusts" it (SAS §2.3). But:
1. **typeDistribution key set.** BIBSS emits keys from `Primitive = null|boolean|integer|number|string`
   (5). SAS's canonical keys are those **plus `boolean-encoded-string`** (6) — a key BIBSS *never
   produces*. SAS treats unknown keys as `"string"` (SAS-014), so it degrades quietly rather than
   erroring, but the intended boolean-encoded-string evidence path is **dead** because the producer
   doesn't emit it. *Spec work: reconcile the key set — either BIBSS emits `boolean-encoded-string`,
   or SAS drops it and detects boolean-encoded strings itself.*
2. **`nullCount` vs `typeDistribution.null`.** SAS's validation reads `nullCount` (`nullCount <=
   occurrences`, SAS §6.1.3). BIBSS has **no `nullCount` field** — it provides `nullable: boolean` and
   `typeDistribution.null` (a count). *Spec work: SAS reads `typeDistribution.null`, or BIBSS adds
   `nullCount`.* (Left unreconciled, SAS's consistency check references a field that isn't there.)
- Coupling to note: SAS hard-requires CISM `version >= 1.3` (SAS-007 fatal otherwise); and SAS
  processes **top-level fields only** — nested CISM is silently skipped (SAS-003). Fine for tabular,
  a real limitation for nested JSON; state it.

### E3. DKNP → Binder  — **MAJOR GAP** ✗✗ (the biggest)
- DKNP emits, **per identifier**, a flat `SemanticTokenList`: `{ sourceIdentifier, normalizedString,
  tokens: string[], metadata }`. One object per call; `tokens` is a lowercase string array.
- The Binder requires `lexis: Record<fieldId, FieldLexis>` where each `FieldLexis` carries a **head
  noun, modifiers, and type markers** (e.g. `id` → reference, `date` → temporal) — i.e. **morphological
  analysis**, keyed by field.
- DKNP does **not** produce head-noun/marker analysis (it tokenizes), is **not** keyed by `fieldId`, and
  returns **one identifier at a time**. So three things are missing: (a) per-field invocation +
  assembly into a map, (b) the `FieldLexis` shape, (c) **the morphological analysis itself** (head noun
  / marker detection from tokens). *Spec work: define `FieldLexis`, decide where morphology lives —
  extend DKNP to emit `FieldLexis` (and a batched/field-keyed mode), or specify a DKNP→Binder adapter
  that derives it — and key it by the canonical `fieldId`.* **This seam needs the most new spec.**

### E4. SAS → Binder  — **MISMATCH** ✗ (the structural channel is under-fed)
- The Binder's structural channel reads, per field: `.fieldId`, `.typeDistribution`, **cardinality**,
  and **coded-identifier flags**.
- SAS's `viz:DataField` emits: `viz:fieldName` / `@id`, `viz:hasDataType` (the *semantic* type),
  `viz:consensusScore`, `sas:structuralType`, `sas:consensusNumerator/Denominator`. It does **not**
  emit `typeDistribution` (that was BIBSS's, consumed and discarded by SAS), nor cardinality, nor an
  explicit coded-identifier flag. So the Binder is reading fields the SAS percept does not contain.
  *Spec work: either SAS passes through the structural evidence the Binder needs (typeDistribution /
  cardinality / a coded-identifier flag), or the Binder's structural channel retargets to what SAS
  actually emits (`viz:hasDataType`, `sas:structuralType`, `consensusScore`). And the field key must be
  the canonical `fieldId`, not `viz:fieldName`.*

### E5. Binder → OCE  — **NEAR-MATCH, by design, but unpinned** ⚠
- The Binder spec asserts `proposals[].proposedBinding` is "EXACTLY the OCE input (OCE §6.2)". OCE
  expects `ProposedBinding { recordConcept: string, roleBindings: [{ fieldId, role, relatumConcept }] }`
  (plain, un-prefixed fields).
- But the Binder's output is JSON-LD with `bind:`-prefixed properties (`bind:fieldId`, `bind:role`,
  `bind:relatumConcept`), and the Binder spec **never actually shows `proposedBinding`'s field names** —
  it asserts the match without exhibiting it. So the seam is *intended* to be direct, but the exact
  field names + the `bind:` namespace vs OCE's plain names are unreconciled. *Spec work: pin
  `proposedBinding`'s shape to OCE's `ProposedBinding` field-for-field (`recordConcept`, `roleBindings`,
  `fieldId`, `role`, `relatumConcept`) and resolve the JSON-LD prefixing so OCE reads it without a
  transform.* (Good news: the verdict model lines up — OCE `incomplete`/empty-roles ↔ Binder
  `residueFields`; the data model is right, only the field-naming needs locking.)

---

## 2. External gaps (block end-to-end; not flaws in the specs present)
- **Fandaws** (terminology + frames) — SAS optional enrichment; **Binder** lexical channel + frame
  retrieval. Stubbable for the deterministic core; required for enriched runs.
- **W2Fuel + ontology + RCR** (the compiled constitutive law) — **OCE requires** `law: { ontology, rcr }`
  (not optional), and the Binder's frameFit channel uses it. Without it, OCE runs only against a stub
  law. This is the heaviest external dependency.
- **ALS** — terminal stage after OCE; out of portfolio.

---

## 3. Spec-work backlog (prioritized — this is the "more spec work" needed to harmonize)

1. **Canonical `fieldId`** (`viz:field/{slug}`) adopted by SAS, DKNP-lexis, Binder channels, OCE. *Unblocks E3, E4, E5.* Highest leverage, smallest change.
2. **DKNP → Binder lexis** (E3): define `FieldLexis`; site the morphological analysis (extend DKNP vs adapter); field-keyed/batched output. *Biggest new spec.*
3. **SAS → Binder structural evidence** (E4): pass through typeDistribution/cardinality/coded-identifier, or retarget the Binder structural channel to SAS's emitted fields.
4. **BIBSS → SAS** (E2): reconcile the typeDistribution key set (`boolean-encoded-string`) + `nullCount` vs `typeDistribution.null`.
5. **Binder → OCE** (E5): pin `proposedBinding` ≡ OCE `ProposedBinding` (names + namespacing).
6. **External**: supply/spec Fandaws, W2Fuel+ontology+RCR (OCE-blocking), ALS.

## 4. Revised recommendation

- **Components are individually buildable** (SNP PROVEN; BIBSS PROVEN; DKNP/SAS/Binder-core/OCE-core
  read buildable) — that part of the earlier recommendation stands.
- **The pipeline is NOT composition-ready.** E2–E5 must be reconciled (backlog §3) before any
  end-to-end build; E3 (DKNP→Binder) and the canonical fieldId (§3.1) are the gating items.
- **Sequence:** do the spec work in backlog order (fieldId first, then E3/E4, then E2/E5) — most are
  small, additive edits — *then* the components compose. Build-in-isolation can proceed in parallel
  (it de-risks each component), but "pipeline-ready" is earned only when the seams pass.
- **Honest status:** a strong, coherent set of components with no contradictions, two already built, and
  a well-understood set of **interface seams that need reconciliation** — exactly the spec work you
  flagged. The seams, not the components, are the remaining work.
