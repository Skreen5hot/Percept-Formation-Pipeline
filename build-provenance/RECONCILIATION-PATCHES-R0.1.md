# Interface-Reconciliation Patches R0.1 — the cheap-win seams

**Authored by:** `agent.specification_writer.v1` (the Specification-Writer AGENT, dispatched via
`claude -p`, role `ex:SpecificationWriterRole`) — **not hand-authored.**
**Gated by:** S-A (spec_acceptance_sa_v1) — verdict **PASS** (well-formed; faithful: all 4 inputs
covered, nothing invented, no dangling traces). Raw agent output + gate verdict:
`RECONCILIATION-PATCHES-spec-writer.json`.
**Scope:** the 3 *cheap-win* seam mismatches from `INTERFACE-RECONCILIATION.md` (the canonical fieldId,
E2, E5). The deep seam **E3 (DKNP→Binder FieldLexis/morphology)** is a separate, larger spec — not here.
**Status:** these are **proposed spec patches** for the four component specs. Applying them is a
spec-edit decision; they have passed the *wellformedness + faithfulness* gate, not yet S-B/S-C.

---

## FR-1 — One canonical fieldId everywhere  *(resolves NEED-FIELDID; seam: SAS/DKNP/Binder/OCE)*

Every pipeline component SHALL identify each field by the single canonical token **`viz:field/{slug}`**
(`{slug}` = the URL-safe field name). Concretely:
- **(a)** SAS `viz:DataField` `@id` = `viz:field/{slug}`
- **(b)** DKNP `SemanticTokenList.sourceIdentifier` = `viz:field/{slug}`, used as the lexis key passed to the Binder
- **(c)** Binder `BindInput` schema keys **and** lexis keys = `viz:field/{slug}`
- **(d)** OCE `ProposedBinding.roleBindings[*].fieldId` = `viz:field/{slug}`

No component may use a bare slug, an RFC-6901 JSON Pointer, or any other field-reference form at these seams.

**Acceptance (named check):** integration test with a field whose slug is `age` — assert SAS emits
`@id='viz:field/age'`, DKNP emits `sourceIdentifier='viz:field/age'`, Binder `BindInput` schema **and**
lexis each have top-level key `'viz:field/age'`, the OCE-bound `roleBindings` entry has
`fieldId='viz:field/age'`; and assert the bare string `'age'` appears as a field-reference key in **no**
serialized seam output.

## FR-2 — typeDistribution: one authoritative key set, BIBSS-owned  *(resolves NEED-E2-KEYS; seam: BIBSS→SAS)*

BIBSS is the **sole** authoritative emitter of `typeDistribution`. The authoritative key set is exactly
`{null, boolean, integer, number, string}`. BIBSS MUST NOT emit a `boolean-encoded-string` key. SAS MUST
NOT read or expect `boolean-encoded-string` from BIBSS; if SAS needs that classification it derives it
**internally** from the five BIBSS keys — that derivation is internal to SAS, not part of the
inter-component contract.

**Acceptance (named check):** BIBSS unit test — for any valid dataset, `typeDistribution` keys are a
strict subset of the 5-key set and `boolean-encoded-string` is absent. SAS unit test — given a 5-key
BIBSS payload, SAS classifies the field with no error, no skip, no null/undefined type.

## FR-3 — null count lives in typeDistribution['null'], no nullCount field  *(resolves NEED-E2-NULLCOUNT; seam: BIBSS→SAS)*

SAS SHALL read the null observation count from `typeDistribution['null']` (the integer already present in
the BIBSS `SchemaNode`). SAS MUST NOT read a top-level `nullCount`. BIBSS MUST NOT add `nullCount`. The
existing BIBSS `nullable` boolean keeps its semantics (true iff ≥1 null observed) and is neither removed
nor renamed.

**Acceptance (named check):** unit test — a `SchemaNode` with `typeDistribution={'null':7,'integer':93}`,
`nullable=true`, no `nullCount`: assert SAS computes null count = 7 from `typeDistribution['null']`, raises
no missing-field error, and BIBSS serialization for the node contains no `nullCount` key.

## FR-4 — Binder emits OCE's plain ProposedBinding (no bind: prefix)  *(resolves NEED-E5-NAMING; seam: Binder→OCE)*

`BindingProposal.proposals[*].proposedBinding` MUST serialize as a plain JSON object with exactly the
field names OCE expects: `{ "recordConcept": string, "roleBindings": [ { "fieldId": string, "role":
string, "relatumConcept": string } ] }`. No `bind:` (or any) namespace prefix on these property names; no
`@context` block requiring expansion before OCE reads them. OCE MUST deserialize `proposedBinding`
directly into its `ProposedBinding` struct with no prefix-strip, JSON-LD expansion, or intermediate
transform.

**Acceptance (named check):** Binder unit test — `proposedBinding` top-level keys are exactly
`{recordConcept, roleBindings}` and each `roleBindings` entry exactly `{fieldId, role, relatumConcept}`,
no prefixes. Integration test — OCE consumes a raw Binder payload and populates `ProposedBinding`
(recordConcept + all roleBindings) with no transform and correct values.

---

### What changes in each component spec (apply targets)

| Patch | SNP | BIBSS | SAS | DKNP | Binder | OCE |
|---|---|---|---|---|---|---|
| FR-1 fieldId | — | — | `@id` form | `sourceIdentifier` form + lexis key | schema+lexis keys | `roleBindings.fieldId` |
| FR-2 typeDist keys | — | sole emitter, 5 keys | drop `boolean-encoded-string` read | — | — | — |
| FR-3 nullCount | — | no `nullCount` | read `typeDistribution['null']` | — | — | — |
| FR-4 binding names | — | — | — | — | emit plain names, no `bind:` | consume directly |

**Note (E2 direction):** the agent resolved both E2 mismatches *toward BIBSS as the source of truth* (SAS
adapts), which keeps the upstream producer stable and pushes the adaptation to the single consumer — the
cheaper edit. E3 remains the one seam that needs new producing behavior (DKNP morphology), tracked
separately.
