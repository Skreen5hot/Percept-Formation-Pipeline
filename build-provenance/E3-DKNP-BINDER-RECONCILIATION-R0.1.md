# E3 Reconciliation — DKNP → Binder (FieldLexis & morphology)

**Authored by:** `agent.specification_writer.v1` (the Specification-Writer AGENT, `claude -p`, role
`ex:SpecificationWriterRole`) — **not hand-authored.**
**Gated by:** S-A (`spec_acceptance_sa_v1`) — **PASS** (6 reqs; faithful: all 4 inputs covered, nothing
invented, no dangling traces; every req carries a named check). Raw output + verdict:
`E3-DKNP-BINDER-spec-writer.json`.
**Seam:** E3 from `INTERFACE-RECONCILIATION.md` — *the biggest gap.* DKNP emits a flat per-identifier
token list; the Binder needs `Record<fieldId, FieldLexis>` with morphological analysis. Three things were
missing: (a) assembly into a map, (b) the `FieldLexis` shape, (c) the morphology itself.
**Status:** **S-A only** (wellformedness + faithfulness). The *design quality* (e.g. "head noun = last
non-marker token") is **not** validated by S-A — that is an S-B/S-C question (build it). Treat this as a
proposed E3 spec, not a proven one.

**Key design decision the agent made:** option **(B)** — a separate `DknpBinderAdapter`, **DKNP
unmodified**. Its justification: DKNP's contract is tokenization; adding `FieldLexis` assembly conflates
two responsibilities and forces DKNP to know the Binder's shape. The adapter is the seam-crossing component.

---

## FR-1 — The `FieldLexis` shape  *(NEED-E3-FIELDLEXIS)*

```ts
interface FieldLexis {
  headNoun: string;          // the core concept noun
  modifiers: string[];       // qualifier tokens (not head, not markers), original order
  typeMarkers: TypeMarker[]; // detected semantic-type annotations
}
type TypeMarker =
  | { kind: 'reference' } | { kind: 'temporal' }
  | { kind: 'quantity' }  | { kind: 'unknown'; token: string };
```
No additional fields permitted. **Check:** `tsc --noEmit` on valid/invalid fixtures + a runtime
presence/array-type assertion.

## FR-2 — The closed marker-detection table  *(NEED-E3-FIELDLEXIS, NEED-E3-MORPHOLOGY)*

`id → reference`; `date|time|at|on → temporal`; `count|num|total|qty → quantity`; any other token → no
marker. **Exhaustive and closed**; expressed as an exported lookup table so tests can iterate its keys.
**Check:** parameterized tests over every table entry + ≥2 negative cases.

## FR-3 — `analyzeTokens(tokens: string[]): FieldLexis`  *(NEED-E3-MORPHOLOGY)*

Pure, deterministic: **(1)** marker scan over tokens; **(2)** head noun = the **last** token that is *not*
a marker (if none, the last token regardless); **(3)** modifiers = all remaining non-head, non-marker
tokens in original order. **Check:** unit tests asserting the full returned object for five cases — one
marker, multiple markers, no markers, all-markers, empty array.

## FR-4 — Siting: a `DknpBinderAdapter`, DKNP unmodified  *(NEED-E3-SITING)*

Option (B). The adapter is the sole producer of `FieldLexis`; the DKNP tokenizer source is unchanged.
**Check:** adapter source exists + exports; grep of DKNP tokenizer for `FieldLexis` returns zero; no net
diff to the DKNP tokenizer.

## FR-5 — `DknpBinderAdapter.assemble(...)`  *(NEED-E3-ASSEMBLY, NEED-E3-SITING)*

`assemble(fields: {fieldId, sourceIdentifier}[], invokeDknp): Record<fieldId, FieldLexis>` — for each
field: `invokeDknp(sourceIdentifier)` → `analyzeTokens(tokens)` → record under `fieldId`. One entry per
input field. `fieldId` MUST be the canonical `viz:field/{slug}` (R0.1 FR-1); the adapter **uses** it, does
not recompute. Fields processed independently (no batching/ordering dependency). **Check:** unit tests
with a mock `invokeDknp` asserting key count, key names, and per-key `FieldLexis`; integration test with
two `viz:field/{slug}` ids.

## FR-6 — Public API surface  *(all four NEEDs)*

The adapter module exports `FieldLexis`, `TypeMarker`, `analyzeTokens`, and `assemble`, so the Binder and
others import types + the morphology function without redefining them. **Check:** `tsc --noEmit` on an
import fixture using all four.

---

### Open quality questions for S-B/S-C (S-A does not judge these)
- **Head-noun = last non-marker token** is a heuristic; English field slugs often put the head noun last
  (`customer_account_id` → `account`), but not always. A build/realization is what would expose its
  failure modes.
- The marker table is a small closed seed set; E3's real morphology may need extension (this is the
  *contract*, not the final lexicon).

These are exactly the things the buildability gate (S-B independent planner → S-C slice build) exists to
surface — S-A confirms only that the spec is well-formed and faithful to the seam it was asked to close.
