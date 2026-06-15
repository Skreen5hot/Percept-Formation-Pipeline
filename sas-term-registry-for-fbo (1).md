# SAS Term Registry for FBO Bridge Developers

**Source:** 6 verified SAS Phase 1 test outputs + kernel code audit of `src/kernel/transform.ts` (2026-03-02)
**Purpose:** Exhaustive list of every `viz:` and `sas:` term that can appear in SAS output, cross-referenced to FBO v1.1 §10 mappings, with gaps flagged.
**Usage:** FBO developers must ensure every term in this registry has an OWL class, property, or individual mapping in `fbo.owl`. No term should be left unbridged.
**Total terms:** 35 entries (18 `viz:` + 17 `sas:`). All 35 are mapped in FBO v1.1 (`BridgeOntology.ttl`). No gaps remain.

---

## How to Read This Document

Each term is listed with:
- **Term**: The exact namespace-prefixed key as it appears in SAS JSON-LD output
- **Role**: Whether it's a class (`@type` value), individual (`@id` value), object property (key pointing to an object), or data property (key pointing to a literal)
- **Where it appears**: Location in the SAS output structure
- **FBO v1.1 mapping**: The corresponding FBO class or property from §10, or ❌ if missing
- **Tests observed**: Which of the 6 test outputs contain this term

---

## Part 1: `viz:` Namespace — 18 Terms

### Classes (2)

| # | Term | Appears As | FBO v1.1 Mapping | Gap? |
|---|------|-----------|-------------------|------|
| V1 | `viz:DatasetSchema` | `@type` on root schema object | `fbo:SemanticSchema` | ✅ Mapped |
| V2 | `viz:DataField` | `@type` on each field entry | `fbo:DataField` + `fbo:EvidencedTypeAssertion` (FBO separates these) | ✅ Mapped |

### Individuals — Variable Types (5)

These are the `@id` values inside `viz:hasDataType`. They are the five named individuals that FBO must ground in STATO.

| # | Term | FBO v1.1 Class | STATO Alignment | Tests Observed | Gap? |
|---|------|---------------|-----------------|---------------|------|
| V3 | `viz:NominalType` | `fbo:NominalVariable` | `owl:equivalentClass STATO:0000252` | 1,2,3,4,5,6 | ✅ Mapped |
| V4 | `viz:QuantitativeType` | `fbo:QuantitativeVariable` | `rdfs:subClassOf STATO:0000251` | 1,2,3,4 | ✅ Mapped |
| V5 | `viz:TemporalType` | `fbo:TemporalVariable` | `rdfs:subClassOf fbo:VariableType` (v1.1 repositioned) | 1,2,5,6 | ✅ Mapped |
| V6 | `viz:BooleanType` | `fbo:BooleanVariable` | `owl:equivalentClass STATO:0000090` | 2,3,4 | ✅ Mapped |
| V7 | `viz:UnknownType` | `fbo:IndeterminateVariable` | `rdfs:subClassOf fbo:VariableType` (disjoint with all typed siblings) | 5 | ✅ Mapped |

### Individuals — Field IRIs (pattern)

| # | Term | Pattern | Example | FBO v1.1 Mapping | Gap? |
|---|------|---------|---------|-------------------|------|
| V8 | `viz:field/{slug}` | `@id` on each `viz:DataField` | `viz:field/revenue`, `viz:field/start-date` | Individual IRI for `fbo:DataField` instance. Slug generated from `viz:fieldName`. | ✅ Mapped (implicitly) |

### Object Properties (2)

| # | Term | Domain → Range | FBO v1.1 Mapping | Gap? |
|---|------|---------------|-------------------|------|
| V9 | `viz:hasField` | `viz:DatasetSchema` → `viz:DataField[]` | `fbo:hasField` | ✅ Mapped |
| V10 | `viz:hasDataType` | `viz:DataField` → `viz:{Type}` | `fbo:assertsVariableType` | ✅ Mapped |

### Data Properties — Per-Field (5)

| # | Term | Domain | Range | FBO v1.1 Mapping | Gap? |
|---|------|--------|-------|-------------------|------|
| V11 | `viz:fieldName` | `viz:DataField` | `xsd:string` (original column name) | `fbo:hasFieldName` | ✅ Mapped |
| V12 | `viz:consensusScore` | `viz:DataField` | `xsd:string` (6-decimal float) | `fbo:hasEvidenceStrength` | ✅ Mapped |
| V15 | `viz:numericPrecision` | `viz:DataField` | `{"integer","float"}` | `fbo:hasNumericPrecision` | ✅ Mapped |
| V16 | `viz:wasNormalized` | `viz:DataField` | `xsd:boolean` (always `true` when present) | `fbo:wasNormalized` (annotation property) | ✅ Mapped |
| V17 | `viz:wasPercentage` | `viz:DataField` | `xsd:boolean` (always `true` when present) | `fbo:wasPercentage` (annotation property) | ✅ Mapped |

**Note on V15:** `numericPrecision` is CONDITIONAL — it only appears when `viz:hasDataType` is `viz:QuantitativeType`. FBO must not declare a universal restriction; it should use an existential on the QuantitativeVariable path only.

**Note on V16–V17:** `wasNormalized` and `wasPercentage` are CONDITIONAL — they only appear when the optional SNP manifest (§4.2) records currency/percentage stripping for a field. No SME test exercised SNP input, so these were absent from the 6-test corpus. Defined in `DataFieldLD` interface (lines 148–149 of `transform.ts`).

### Data Properties — Per-Schema (3)

| # | Term | Domain | Range | FBO v1.1 Mapping | Gap? |
|---|------|--------|-------|-------------------|------|
| V13 | `viz:totalRows` | `viz:DatasetSchema` | `xsd:integer` | `fbo:hasTotalRows` | ✅ Mapped |
| V14 | `viz:rawInputHash` | `viz:DatasetSchema` | `xsd:string` (sha256:...) | `fbo:hasRawInputHash` | ✅ Mapped |
| V18 | `viz:rowsInspected` | `viz:DatasetSchema` | `xsd:integer` | `fbo:hasRowsInspected` (data property) | ✅ Mapped |

**Note on V18:** `rowsInspected` is CONDITIONAL — it only appears when CISM `sampling.applied` is `true`, recording how many rows were actually profiled vs the full dataset (`totalRows`). No SME test exercised sampling, so this was absent from the 6-test corpus. Defined in `DatasetSchemaLD` (line 171 of `transform.ts`).

---

## Part 2: `sas:` Namespace — 17 Terms

### Classes (1)

| # | Term | Appears As | FBO v1.1 Mapping | Gap? |
|---|------|-----------|-------------------|------|
| S1 | `sas:AlignmentConfiguration` | `@type` inside `sas:activeConfig` | `fbo:AlignmentConfiguration` (class) | ✅ Mapped |

### Object Properties (1)

| # | Term | Domain → Range | FBO v1.1 Mapping | Gap? |
|---|------|---------------|-------------------|------|
| S2 | `sas:activeConfig` | `viz:DatasetSchema` → `sas:AlignmentConfiguration` | `fbo:governedBy` (object property) | ✅ Mapped |

### Data Properties — Per-Field (4)

These appear on every `viz:DataField` object.

| # | Term | Range | FBO v1.1 Mapping | Gap? |
|---|------|-------|-------------------|------|
| S3 | `sas:alignmentRule` | `xsd:string` | `fbo:producedByRule` | ✅ Mapped |
| S4 | `sas:consensusNumerator` | `xsd:integer` | `fbo:hasConsensusNumerator` | ✅ Mapped |
| S5 | `sas:consensusDenominator` | `xsd:integer` | `fbo:hasConsensusDenominator` | ✅ Mapped |
| S6 | `sas:structuralType` | `xsd:string` | `fbo:hasStructuralType` | ✅ Mapped |

**Observed values for S3 (`alignmentRule`):**
- `"consensus-promotion"` — Tests 1–6 (all fields except temporal)
- `"temporal-detection"` — Tests 1, 2, 5, 6 (date-named fields)

**Observed values for S6 (`structuralType`):**
- `"string"` — Tests 1–6
- `"integer"` — Tests 2, 3, 4
- `"number"` — Test 3
- `"boolean"` — Tests 2, 3, 4

### Data Properties — Per-Field, Annotation (1)

| # | Term | Range | FBO v1.1 Mapping | Gap? |
|---|------|-------|-------------------|------|
| S7 | `sas:fandawsConsulted` | `xsd:boolean` (always `false` in Phase 1) | annotation on `fbo:EvidencedTypeAssertion` | ✅ Mapped |

### Data Properties — Schema-Level (2)

| # | Term | Range | FBO v1.1 Mapping | Gap? |
|---|------|-------|-------------------|------|
| S8 | `sas:alignmentMode` | `xsd:string` (`"standalone"`) | annotation on `fbo:SemanticAlignmentProcess` | ✅ Mapped |
| S9 | `sas:fandawsAvailable` | `xsd:boolean` (always `false` in Phase 1) | annotation on `fbo:SemanticAlignmentProcess` | ✅ Mapped |

### Data Properties — Inside `sas:activeConfig` (5)

These appear inside the `sas:AlignmentConfiguration` object.

| # | Term | Range | FBO v1.1 Mapping | Gap? |
|---|------|-------|-------------------|------|
| S10 | `sas:consensusThreshold` | `xsd:decimal` ∈ (0.0, 1.0] | `fbo:hasConsensusThreshold` (data property) | ✅ Mapped |
| S11 | `sas:minObservationThreshold` | `xsd:integer` ≥ 0 | `fbo:hasMinObservationThreshold` (data property) | ✅ Mapped |
| S12 | `sas:nullVocabulary` | `array of xsd:string` | `fbo:hasNullVocabulary` (data property, multi-valued) | ✅ Mapped |
| S13 | `sas:booleanPairs` | `array of pair objects` | `fbo:hasBooleanPairMapping` (object property → `fbo:BooleanPairMapping`) | ✅ Mapped |
| S14 | `sas:temporalNamePattern` | `xsd:string` (regex) | `fbo:hasTemporalNamePattern` (data property) | ✅ Mapped |

### Data Properties — Inside `sas:booleanPairs` Entries (3)

These appear on each object inside the `sas:booleanPairs` array when boolean pair mappings are configured. They are absent when `sas:booleanPairs` is empty (`[]`).

| # | Term | Range | FBO v1.1 Mapping | Gap? |
|---|------|-------|-------------------|------|
| S15 | `sas:fieldName` | `xsd:string` (column name) | `fbo:forFieldName` (data property on `fbo:BooleanPairMapping`) | ✅ Mapped |
| S16 | `sas:trueValue` | `xsd:string` (e.g., `"Yes"`, `"T"`) | `fbo:hasTrueValue` (data property on `fbo:BooleanPairMapping`) | ✅ Mapped |
| S17 | `sas:falseValue` | `xsd:string` (e.g., `"No"`, `"F"`) | `fbo:hasFalseValue` (data property on `fbo:BooleanPairMapping`) | ✅ Mapped |

**Note:** No SME test configured boolean pairs with actual entries (all tests had `"sas:booleanPairs": []`), so these predicates were absent from the 6-test corpus. They are defined in `ActiveConfigLD` (line 158 of `transform.ts`) and emitted by `serializeConfig()` (lines 541–543). FBO maps these via `fbo:BooleanPairMapping` (class) with `fbo:forFieldName`, `fbo:hasTrueValue`, and `fbo:hasFalseValue` (data properties).

---

## Part 3: Gap Analysis

### Status: All 35 terms mapped — no gaps remain

Cross-referencing the 35-term registry against `BridgeOntology.ttl` (FBO v1.1) confirms complete coverage. Every `viz:` and `sas:` term has a corresponding OWL class, property, or individual in the TTL.

| Category | Count |
|----------|-------|
| `viz:` terms mapped | 18 / 18 |
| `sas:` terms mapped | 17 / 17 |
| **Total** | **35 / 35** |

### How the 13 originally-gapped terms were resolved

The original 29-term registry (built from 6 SME test outputs) identified 11 unmapped terms plus 2 with missing §10.2 rows. The FBO team's `BridgeOntology.ttl` gap-fill sections (Step 1.5, annotation properties block, registry gap-fills) covered all of them before this registry update was performed.

| # | SAS Term | FBO Mapping | Resolution |
|---|----------|-------------|------------|
| S1 | `sas:AlignmentConfiguration` | `fbo:AlignmentConfiguration` (class) | Already in TTL |
| S2 | `sas:activeConfig` | `fbo:governedBy` (object property) | Already in TTL |
| S10 | `sas:consensusThreshold` | `fbo:hasConsensusThreshold` (data property) | Already in TTL |
| S11 | `sas:minObservationThreshold` | `fbo:hasMinObservationThreshold` (data property) | Already in TTL |
| S12 | `sas:nullVocabulary` | `fbo:hasNullVocabulary` (data property, multi-valued) | Already in TTL |
| S13 | `sas:booleanPairs` | `fbo:hasBooleanPairMapping` (object property → `fbo:BooleanPairMapping`) | Already in TTL |
| S14 | `sas:temporalNamePattern` | `fbo:hasTemporalNamePattern` (data property) | Already in TTL |
| S15 | `sas:fieldName` | `fbo:forFieldName` (data property on `fbo:BooleanPairMapping`) | Already in TTL |
| S16 | `sas:trueValue` | `fbo:hasTrueValue` (data property on `fbo:BooleanPairMapping`) | Already in TTL |
| S17 | `sas:falseValue` | `fbo:hasFalseValue` (data property on `fbo:BooleanPairMapping`) | Already in TTL |
| V16 | `viz:wasNormalized` | `fbo:wasNormalized` (annotation property) | Already in TTL |
| V17 | `viz:wasPercentage` | `fbo:wasPercentage` (annotation property) | Already in TTL |
| V18 | `viz:rowsInspected` | `fbo:hasRowsInspected` (data property) | Already in TTL |

### FBO work required: None

The TBox is complete. No new classes, properties, or §10.2 rows are needed. Two TTL comment corrections (on `fbo:hasAlignmentMode` and `fbo:producedByRule`) were requested and applied — see `memo-to-ontology-team-2026-03-02.md` for details.

---

## Part 4: Diagnostic Codes

SAS diagnostics appear in the top-level `diagnostics` array, outside the `schema` object. They use plain strings, not namespace-prefixed terms. FBO v1.1 maps SAS diagnostics to `IAO:report` (§4.3) but does not define individual classes per diagnostic code.

**Observed diagnostic codes across all 6 tests:**

| Code | Level | Meaning | Tests Observed |
|------|-------|---------|---------------|
| SAS-001 | warning | No type consensus above threshold | 3, 5 |
| SAS-003 | info | Nested structure skipped | 3 |
| SAS-010 | info | Temporal detected via name pattern | 1, 2, 5, 6 |
| SAS-012 | warning | Insufficient observations for consensus | 5 |

**Not observed (no test coverage):** SAS-002, SAS-007, SAS-008, SAS-009, SAS-013, SAS-014

**FBO recommendation:** Diagnostics do not need individual OWL classes. They are string-coded annotations on the `fbo:SemanticAlignmentProcess`. The diagnostic code vocabulary should be documented in FBO §10 as an enumerated annotation value set, not as a class hierarchy.

---

## Part 5: `@context` Block

Every SAS output contains:

```json
"@context": {
  "fandaws": "https://schema.fnsr.dev/fandaws/v3#",
  "prov": "http://www.w3.org/ns/prov#",
  "sas": "https://schema.fnsr.dev/sas/v1#",
  "viz": "https://schema.fnsr.dev/ecve/v4#"
}
```

FBO §10.3 correctly identifies `@context` as a JSON-LD serialization artifact with no FBO class. The namespace IRIs above are the expansion targets. When FBO Phase 4 (namespace migration) replaces `viz:` and `sas:` with `fbo:` IRIs, this `@context` block will change — but the terms it prefixes will map 1:1 to FBO properties and classes.

**Note for FBO developers:** The `prov:` and `fandaws:` prefixes are declared but never used in Phase 1 output. They are forward declarations for Phase 1v2 (Fandaws enrichment) and future provenance extensions. Do not create FBO mappings for them yet.

---

## Part 6: Observed Value Enumerations

For FBO developers implementing SHACL shapes or value constraints:

### `sas:alignmentRule` values
- `"consensus-promotion"` — The consensus cascade assigned a type
- `"temporal-detection"` — Name pattern overrode consensus to assign TemporalType
- (Not yet observed in 6 tests: `"temporal-detection-snp-evidence"`, `"boolean-pair-configured"`, `"null-vocabulary-configured"`, `"structural-passthrough"`, `"unknown-assignment"`, `"cism-validation-failed"`, `"fandaws-override"`)

### `sas:structuralType` values
- `"string"`, `"integer"`, `"number"`, `"boolean"`
- (Not yet observed: `"null"` — would appear only if a field is entirely null)

### `viz:numericPrecision` values
- `"integer"` — All non-null values are integers
- `"float"` — At least one non-null value is a non-integer number
- (Only appears when `viz:hasDataType` = `viz:QuantitativeType`)

### `viz:hasDataType` @id values
- `viz:NominalType`, `viz:QuantitativeType`, `viz:TemporalType`, `viz:BooleanType`, `viz:UnknownType`
- Exhaustive for Phase 1. No other values are possible.

---

*End of registry. 35 entries total (29 from 6-test corpus + 6 from kernel code audit). This document should be updated when new SAS features add terms (Phase 1v2 Fandaws enrichment will add `fandaws:` terms).*
