# Semantic Binder (SFB)

## Frame Resolution and Role Proposal

## Technical Specification — Version 1.0

| Field | Value |
|---|---|
| **Document ID** | `binder-core-01` |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Author** | Aaron |
| **Date** | 2026-03-04 |
| **FNSR Component** | Conjectural Proposal Layer (frame recognition) |
| **Edge-Canonical Compliance** | Conditional (see §4.2 — evidence assembly is edge-canonical; proposal depends on the adapter) |
| **Canonical Representation** | JSON-LD (output) |
| **Consumes** | SAS `viz:DatasetSchema` + DKNP field lexis + Fandaws terminology + the constitutive law (ontology + RCR) + binding context |
| **Produces** | `bind:BindingProposal` — ranked `ProposedBinding`s with convergence profiles and review flags, for OCE adjudication |

---

## 1. Purpose

The Semantic Binder (SFB, "the Binder") **proposes that a table's rows fall under a conceptual frame, and assigns each column to a role in that frame.** It is the component that recognizes "this shipments table is about `fan:ActOfShipping`, with `driverID` as the operator and `transportID` as the vehicle."

It produces a `ProposedBinding` — exactly the input the OCE consumes. The division of labor is strict and is the spine of this specification: **the Binder conjectures; the OCE adjudicates.** The Binder offers a candidate frame and role assignment; it does not, and cannot, certify that the candidate is warranted. That certification is the OCE's deterministic test of constitutive necessity. A proposal that the OCE refuses returns to the Binder (or to a curator) for re-proposal. Nothing the Binder produces is ever asserted without passing the OCE firewall.

**Architectural position:**

```
SNP → BIBSS → SAS ──(percept: typed schema)──┐
DKNP ──(field morphology)────────────────────┤
Fandaws ──(terminology + frames)─────────────┤──► SFB (the Binder)
ontology + RCR ──(the constitutive law)──────┤      │ proposes ProposedBinding(s)
binding context ──(table topic / scope)──────┘      │ + convergence + review flags
                                                    ▼
                                  confident? ──► OCE.adjudicate
                                  ambiguous? ──► commit gate (curator / M2M) ──► OCE
                                                    │
                                          warranted │ refused → back to Binder
                                                    ▼
                                                   ALS → SHACL gate → HIRI → MDRE
```

The Binder is the single point in the FNSR semantic pipeline where **fallible, possibly probabilistic, inference is sanctioned.** Everything else — SNP, BIBSS, SAS, OCE, ALS — is deterministic. The Binder is deliberately not (its proposal may use heuristics or a language model). This is safe not because the Binder is reliable in isolation — it is not — but because it is **fire-walled downstream by the OCE (deterministic constitutive adjudication) and the commit gate (human/curatorial review at ambiguity).** §4 makes this inversion explicit and explains why it holds.

---

## 2. Philosophical Footing

This section is proportionate; the Binder is an engineering-heavy component and the philosophy fixes its scope rather than driving its mechanics. (For the full Steinerian frame, see the OCE specification §2–§3.)

### 2.1 The Binder Is Conjecture, Not Knowledge

In the cognitive synthesis, the percept is given (SAS) and the concept is brought (Fandaws/W2Fuel/RCR). Before knowledge arises, something must *reach for* a concept to grasp the percept — must conjecture that *this* percept falls under *that* concept. That reaching is the Binder. It is hypothesis-formation, not yet knowledge: the offering of a candidate frame, awaiting the lawful test that would confirm or refuse the grasp. The Binder's output is, in the strictest sense, a **proposal** — and the specification never lets it be treated as more.

### 2.2 The Binder and the OCE Are a Polarity

The two error-tendencies of cognition are architecturally separated in this pipeline, which is the deeper reason for the Binder/OCE split. The OCE, being cold lawful necessity, is **Ahrimanic-prone** — mechanism that could grind on, present to nothing (OCE §3.3). The Binder, being fallible imaginative reach, is **Luciferic-prone** — the tendency toward ungrounded fluency, toward seeing frames that are not there, toward confident confabulation. A language model proposing a frame the data does not support is the Luciferic excess made concrete: untethered fluency. The architecture's answer is the classical one: imaginative proposal (Luciferic) is disciplined by lawful necessity (the corrective), and the two are held in balance by a third — here, the commit gate and, ultimately, the unbuilt reflexive faculty. The Binder and the OCE are not merely two stages; they are two poles that bracket the synthesis and correct each other.

### 2.3 What the Binder Proposes, and What It Does Not Settle

The Binder proposes the **symbolic frame** — which concept, which roles. It does not ground reference (a column proposed as `fan:Driver` is not thereby *about* actual drivers; that aboutness is the OCE/A-Box matter settled elsewhere). It does not adjudicate necessity. It does not assert. Its confidence is **heuristic convergence**, never lawful warrant.

---

## 3. Boundary of Competence (Normative)

The Binder:

- **Guesses; it does not know.** Its output is a proposal with a heuristic confidence, never a fact and never a warrant.
- **Does not adjudicate constitutive necessity** (the OCE) — even though it *uses* the law permissively to rank proposals, it never certifies fulfillment. Permissive ranking and strict adjudication are different acts (§5.4).
- **Does not assert** (ALS) or **store** (HIRI).
- **Does not ground reference, constitute understanding, or bear agency** (OCE §3).
- **Must not have its confidence read as the OCE's verdict.** A high Binder confidence is a strong conjecture; only an OCE `succeeds`/`incomplete` is a warrant. Any component that asserts on Binder confidence alone, bypassing the OCE, violates this specification.

The Binder is the sanctioned home of fallible inference precisely so that fallibility is *contained* — proposed here, tested downstream, and never laundered into assertion without the firewall.

---

## 4. The Inverted Determinism Pattern (and Why It Is Safe)

### 4.1 The Inversion

Every other FNSR semantic component guarantees determinism as a primary safety property. The Binder does not, and the deviation is intentional. Frame recognition is genuinely abductive — inference to the best explanation of why a table is shaped as it is — and the best available proposers (including language models) are non-deterministic. Forcing determinism on the proposer would forfeit recall on exactly the hard, ambiguous cases that matter.

### 4.2 Scoped Determinism

The Binder's determinism contract is **scoped to evidence assembly** (§5.1–§5.3): given the same SAS schema, the same DKNP lexis, and the same Fandaws scope content, the Binder gathers byte-identical evidence. The **proposal step** (§5.4) is deterministic **iff** the configured `ProposalAdapter` is deterministic:

- **Standalone / baseline:** the default deterministic heuristic ranker (§5.5). The whole Binder is then deterministic and edge-canonical.
- **Enriched:** a language-model-backed adapter (§7.2), isolated behind the adapter boundary exactly as Fandaws isolates LLMs behind its OrchestrationAdapter. The proposal is then non-deterministic, and the output is marked with the adapter's epistemic provenance (`bind:proposalSource: "probabilistic"`).

### 4.3 Why It Is Safe

Soundness of the pipeline does **not** depend on the Binder's determinism. It depends on two downstream guarantees that hold regardless of how the Binder proposes:

1. **The OCE firewall.** Every proposal is deterministically adjudicated against constitutive necessity before assertion. A hallucinated or mis-typed frame is caught as `violated` (a vehicle proposed as the operator → `fails`), or its gaps surfaced as `empty` (`incomplete`). The Binder cannot push an unwarranted synthesis through.
2. **The commit gate.** Proposals below the confidence threshold, or where channels diverge, are routed to curatorial/M2M review before the OCE — Fandaws's "semantic firewall" philosophy applied at the frame level. Genuinely ambiguous frames are *committed to*, not silently asserted.

The Binder is therefore allowed to be fallible because its fallibility is bounded by a deterministic test and a human gate. This is the controlled admission of probabilistic inference into an otherwise deterministic stack: permitted in exactly one place, marked as such, and fire-walled.

---

## 5. The Channels and the Proposal

The Binder mimics the convergent, multi-channel act by which a competent human reads a column. **Reliability comes from convergence across independent channels, not from any single oracle.** The Binder assembles evidence from independent channels, and proposes only where they converge; where they diverge, it flags for commit.

### 5.1 The Channels

For each field, and each candidate (field, role) pairing, the Binder gathers a vote from each channel: **agree**, **disagree**, or **silent**.

| Channel | Source | What it votes on |
|---|---|---|
| **morphology** | DKNP field lexis | Does the field's head noun / modifiers align with the role's expected filler? (`driverID` → head `driver` aligns with an operator/agent role; the `id` marker indicates an identifier, hence a *reference*, not an attribute.) |
| **lexical** | Fandaws `resolveTerm` | Does the field's head ground to a concept type-compatible with the role's relatum? (`driver` → `fan:Driver`, and `fan:Driver ⊑ fan:Agent`, the operator role's range.) |
| **structural** | SAS / BIBSS evidence | Does the field's *shape* match the role's filler kind? Reference-shaped fields (coded-identifier, high-cardinality, key-like) fill **participant** roles (object properties); literal-shaped fields (low-cardinality, measured, temporal) fill **attribute/quality** roles (data properties). |
| **frameFit** | ontology + RCR (permissive) | Is the role a constitutive role of the candidate frame, and does the field's grounded type satisfy its relatum requirement? (Used here to *rank*; the OCE uses the strict version to *adjudicate* — §5.4.) |
| **topic** *(optional)* | binding context | Does the table topic / name / scope support the candidate frame? (A table named "shipments" supports `fan:ActOfShipping`.) |

Channels are **independent** by construction: morphology reads the name, lexical reads terminology, structural reads the data shape, frameFit reads the law, topic reads the context. Agreement across independent channels is the reliability signal; the more channels that agree on a binding, the stronger the conjecture.

### 5.2 Candidate Frame Generation

The Binder retrieves candidate frames — concepts whose constitutive role-slots could be filled by the available columns — from Fandaws, seeded by (a) the topic/context, (b) the concepts the fields lexically ground to, and (c) which concepts have constitutive relations (role-slots) matching the available reference-shaped and attribute-shaped columns. Candidate generation is permissive: better to consider a frame and reject it than to miss it.

### 5.3 Role Assignment (per candidate frame)

For each candidate frame, the Binder solves an assignment: map columns to the frame's role-slots so as to maximize total channel convergence, subject to each role-slot taking at most one column (and each column at most one role) unless the law permits multiplicity. This is a bounded assignment problem; the deterministic adapter solves it by convergence-weighted matching.

### 5.4 Abduction: Frame Selection

Among candidate frames that survive assignment, the Binder selects by **inference to the best explanation** — the frame that accounts for the most of the table with the least left over:

```
coverage(frame)  = (constitutive role-slots filled) / (total constitutive role-slots)
residue(frame)   = (columns left unbound) / (total columns)
frameScore(frame) = w_c · coverage  −  w_r · residue  +  w_v · meanConvergence(bindings)
```

The highest-scoring frame is proposed; the **margin** over the runner-up feeds confidence (§5.6). A small margin means several frames explain the table comparably well — a signal of ambiguity, routed to commit.

> **Permissive ranking vs. strict adjudication.** The Binder uses `frameFit` and coverage **permissively** to *rank candidates* — a near-fit still scores, an empty role still allows a frame. The OCE uses the **strict** form to *adjudicate the winner*: an empty constitutive role yields `incomplete`, a type-disjoint binding yields `fails`. The Binder is allowed to propose a frame the OCE will mark incomplete; that is the intended flow. What the Binder must not do is treat its permissive score as the OCE's strict warrant.

### 5.5 The Default Deterministic Adapter

The baseline `ProposalAdapter` is a pure, deterministic ranker: it generates candidate frames from Fandaws retrieval, solves convergence-weighted assignment, scores by §5.4, and returns the ranked proposals. With this adapter the Binder is fully edge-canonical and reproducible. It will miss frames a richer proposer would find (its recall is bounded by lexical and structural exactness), but everything it proposes is deterministic and every miss is a silent omission, never a confident error.

### 5.6 Confidence and the Convergence Profile

The Binder attaches to each proposed binding a **convergence profile** — the per-channel vote record — and a derived per-binding confidence (a function of how many independent channels agree). Each frame proposal carries an overall confidence derived from coverage, mean per-binding convergence, and the margin over the runner-up frame.

Two configurable thresholds govern routing:

- **`proposeThreshold`** — at or above, the proposal is emitted as a confident conjecture for direct OCE adjudication.
- **`commitThreshold`** — below, the proposal is routed to the commit gate (§6) before the OCE.
- **Between** — emitted but marked `requiresReview: true`.

### 5.7 The Coded-vs-Literal Determination (feeds ALS)

A by-product of the structural channel: the Binder marks each bound field as **reference-shaped** (fills a participant role → becomes an object-property / coded-identifier in the eventual `DomainMapping`) or **literal-shaped** (fills an attribute/quality role → a data-property literal). On an OCE-warranted proposal, the orchestrator constructs the ALS `DomainMapping` from this: `recordConcept` → `recordClass`, participant bindings → `fieldPredicates` + `codedIdentifierFields` + `entityClasses`, attribute bindings → `fieldPredicates`. The Binder thus supplies the frame; the OCE warrants it; the orchestrator hands ALS the warranted mapping.

---

## 6. The Commit Gate

The commit gate is **not** part of the Binder's pure computation; it is an adapter boundary the orchestrator wires. When a proposal is routed to commit (below `commitThreshold`, or OCE-refused, or tied on margin), it is presented for resolution:

- **Human curator** — reviews the convergence profile and the competing frames, and confirms, edits, or rejects the binding. This is Fandaws's curator-review pattern (§5.13) applied to frame binding.
- **M2M negotiation** — an upstream agent and the system negotiate the binding via Fandaws's structured-thinking protocol, committing to a grounded frame.

The gate's resolution becomes a (possibly edited) `ProposedBinding` that proceeds to the OCE. Ambiguous frames — `company` that could be shipper, carrier, or consignee — are exactly what the gate exists for; no heuristic resolves genuine underdetermination, and the architecture commits rather than guesses. The committed resolution may be promoted into Fandaws terminology so the ambiguity is resolved once, not every time.

---

## 7. Adapters

### 7.1 `FandawsScope` (terminology + frames)

The same read-only, pure, synchronous, deterministic interface SAS uses (SAS §4.3), extended with frame retrieval: `resolveTerm(label)`, `getConcept(id)`, and `retrieveFrames(seed)` returning candidate frame concepts. The scope is caller-supplied in-memory data; the Binder holds no reference between invocations.

### 7.2 `ProposalAdapter` (the fallible proposer)

```typescript
interface ProposalAdapter {
  propose(evidence: AssembledEvidence): RankedProposal[]
}
```

- **Default (`deterministic`):** the §5.5 ranker. Pure, edge-canonical.
- **Optional (`probabilistic`):** an LLM-backed proposer. It receives the assembled evidence (candidate frames, per-channel votes, structural shapes) and returns ranked proposals with rationales. It is isolated behind this boundary, its results are tagged `bind:proposalSource: "probabilistic"`, and — like Fandaws's external integrations — it must return provenance for auditability. It is never permitted to assert; its output is a proposal subject to the OCE firewall and the commit gate.

### 7.3 `CommitGate` (§6)

The pluggable curatorial/M2M resolution boundary. Default: a no-op that passes `requiresReview` proposals through with the flag intact (so a headless pipeline surfaces them rather than silently committing). Production deployments wire a real curator or negotiation interface.

---

## 8. Output Data Model

```typescript
interface BindingProposal {
  "@type": "bind:BindingProposal"
  "bind:datasetHash": string                    // viz:rawInputHash, for provenance continuity
  "bind:proposalSource": "deterministic" | "probabilistic"
  "bind:proposals": RankedProposal[]            // ranked; [0] is the selected frame
  "bind:diagnostics": Diagnostic[]
}

interface RankedProposal {
  "bind:proposedBinding": ProposedBinding        // EXACTLY the OCE input (OCE §6.2)
  "bind:frameScore": number
  "bind:confidence": number                      // overall, in [0,1]
  "bind:margin": number                          // score gap to the runner-up frame
  "bind:requiresReview": boolean
  "bind:bindings": BindingEvidence[]             // per role-binding evidence
  "bind:residueFields": string[]                 // columns left unbound (the unexplained remainder)
}

interface BindingEvidence {
  "bind:fieldId": string
  "bind:role": string
  "bind:relatumConcept": string | null
  "bind:fillerKind": "reference" | "literal"     // feeds ALS coded-vs-literal (§5.7)
  "bind:convergence": ChannelVote[]              // per-channel agree/disagree/silent
  "bind:bindingConfidence": number
}

interface ChannelVote {
  "bind:channel": "morphology" | "lexical" | "structural" | "frameFit" | "topic"
  "bind:vote": "agree" | "disagree" | "silent"
  "bind:evidence": string                        // human-legible justification
}
```

The convergence profile is fully exposed: which channels agreed on each binding, on what evidence. This makes the proposal auditable by a curator and legible to the OCE (whose `SynthesisJudgment` then records the lawful verdict over the same bindings). The `bind:proposalSource` flag travels with the proposal so every downstream party knows whether it came from a deterministic ranker or a probabilistic proposer.

---

## 9. Public API

```typescript
interface SemanticBinder {
  bind(input: BindInput): BindingProposal
}

interface BindInput {
  schema: VizDatasetSchema                        // SAS percept
  lexis: Record<string, FieldLexis>               // DKNP output per fieldId (morphology)
  law: { ontology: JsonLdDocument; rcr: JsonLdDocument }   // for frameFit + role-slots
  scope: FandawsScope                             // terminology + frame retrieval
  context?: BindingContext                        // table name, topic hint, ontology scope
  config?: Partial<BinderConfig>
  proposalAdapter?: ProposalAdapter               // default: deterministic ranker
}

interface BindingContext {
  tableName?: string
  topicHint?: string
  ontologyScope?: string                          // which Fandaws scope / domain
}

interface BinderConfig {
  proposeThreshold: number                        // default 0.75
  commitThreshold: number                         // default 0.45
  maxCandidateFrames: number                      // default 12
  weights: { coverage: number; residue: number; convergence: number }  // §5.4
}
```

The Binder does not throw. Conditions that prevent proposal (no candidate frame, empty schema) yield a `BindingProposal` with an empty `bind:proposals` and an explanatory diagnostic.

---

## 10. Integration Pipeline

```
SAS (viz: schema) ─┐
DKNP (field lexis) ─┤
ontology + RCR ─────┤──► SFB.bind ──► BindingProposal
Fandaws scope ──────┤                    │
context ────────────┘                    ▼
                        confidence ≥ proposeThreshold ? ──► OCE.adjudicate(proposals[0])
                        confidence < commitThreshold  ? ──► CommitGate ──► OCE.adjudicate
                                                                              │
                                          ┌───────────────┬───────────────────┴─────┐
                                       succeeds       incomplete                  fails
                                  build DomainMapping  build partial mapping   refuse →
                                  from fulfilled       + flag empty roles      back to SFB
                                  bindings (§5.7)            │                  (re-propose)
                                          └────────┬─────────┘
                                                   ▼
                                                  ALS → SHACL gate → HIRI → MDRE
```

The Binder occupies the seam between the typed percept (SAS) and the lawful test (OCE). It is the proposer; the OCE is the firewall; the commit gate is the human/curatorial backstop; ALS is the asserter. The four together turn raw columns into warranted, grounded A-Box facts — with fallible inference admitted exactly once, in the Binder, and bounded everywhere it could do harm.

---

## 11. Diagnostic Codes

| Code | Level | Condition |
|---|---|---|
| `BIND-001` | warning | No candidate frame found for the schema; `bind:proposals` empty. |
| `BIND-002` | info | Multiple frames within margin tolerance (ambiguous); top proposal flagged `requiresReview`. `{ frames }`. |
| `BIND-003` | warning | Column left unbound (residue); no role-slot fits. `{ fieldId }`. |
| `BIND-004` | warning | Low convergence on a binding (channels disagree or silent); `requiresReview`. `{ fieldId, role, convergence }`. |
| `BIND-005` | info | Probabilistic proposal source used; output is non-deterministic and subject to OCE + commit. |
| `BIND-006` | info | Topic hint unrecognized; proceeded on morphology/lexical/structural channels only. |
| `BIND-007` | warning | A field grounded to multiple type-compatible roles of the frame (role ambiguity, e.g. shipper vs. consignee); `requiresReview`. `{ fieldId, roles }`. |
| `BIND-008` | info | Proposal routed to commit gate (below `commitThreshold` or OCE-refused). |

---

## 12. Determinism and Canonicalization

Evidence assembly (§5.1–§5.3) is deterministic; with the default deterministic adapter the entire output is byte-identical across runs (JCS, RFC 8785). Channel votes are emitted in fixed order (morphology, lexical, structural, frameFit, topic); proposals are ordered by `frameScore` descending, ties broken lexicographically by `recordConcept`. With a probabilistic adapter, only the evidence portions are reproducible; the proposal ordering and selection are not, and `bind:proposalSource: "probabilistic"` records this. No timestamps appear in the canonical output.

---

## 13. Performance

Let `F` = fields, `R` = candidate frames, `S` = role-slots per frame. Evidence assembly is `O(F × R × S)` channel evaluations; assignment per frame is `O(F × S)` under convergence-weighted matching. With `R` bounded by `maxCandidateFrames` and modest schemas, the deterministic path completes in well under 50 ms. A probabilistic adapter's latency is the model's and is outside the edge-canonical envelope.

---

## 14. Security Considerations

- **No network calls** in the deterministic path; **no persistence**; **no `eval`**; **no prototype pollution** (`Object.hasOwn` on untrusted schema/graph keys).
- **Probabilistic inference is confined to one labeled adapter** and fire-walled by the OCE and the commit gate. It can never assert. Its output is always marked `probabilistic`, so no downstream party mistakes a model's guess for a deterministic result or a lawful warrant.
- **No silent commitment.** The default `CommitGate` passes `requiresReview` proposals through *with the flag*, so a headless deployment surfaces ambiguity rather than asserting through it. Suppressing review requires an explicit, owned `CommitGate` implementation.
- **Confidence cannot be mistaken for warrant.** The output structurally separates `bind:confidence` (heuristic) from anything the OCE produces (lawful), and §3 forbids asserting on confidence alone.

---

## 15. Testing Contract

### 15.1 Determinism (deterministic adapter)

`JCS(bind(input))` byte-identical across runs and runtimes; channel votes and proposal ordering stable.

### 15.2 Required Test Cases

| Category | Cases |
|---|---|
| Convergent binding | `driverID` with morphology + lexical + structural + frameFit all agreeing → high-confidence `hasAgent (fan:Driver)` binding. |
| Frame selection (abduction) | Shipment columns → `fan:ActOfShipping` outscores competing frames by coverage/residue; correct top proposal. |
| Incomplete-but-proposed | Shipment table with no goods column → frame still proposed (permissive), `hasObject` role unfilled; OCE later marks incomplete. |
| Role ambiguity → review | A `company` column grounding to multiple frame roles (shipper/carrier/consignee) → `requiresReview`, `BIND-007`. |
| Frame ambiguity → commit | Two frames within margin → `requiresReview`, `BIND-002`, routed to commit. |
| Coded-vs-literal | Reference-shaped field → `fillerKind: reference`; temporal/measured field → `fillerKind: literal`. |
| No frame | Schema with no retrievable frame → empty proposals, `BIND-001`. |
| Probabilistic provenance | LLM adapter → output tagged `probabilistic`, `BIND-005`; non-determinism confined to proposal. |
| Convergence profile completeness | Every binding records a vote from every applicable channel. |
| Firewall handoff | The emitted `proposedBinding` validates as a well-formed OCE input. |

### 15.3 Property-Based Invariants

1. `bind` terminates and never throws.
2. With a deterministic adapter, output is a pure function of the inputs.
3. Every binding in every proposal carries a complete convergence profile.
4. `bind:confidence` is never presented as, nor structurally conflated with, an OCE warrant.
5. The selected proposal's `proposedBinding` is always a structurally valid OCE input.
6. The Binder asserts, stores, and mutates nothing.
7. A `probabilistic` proposal source always sets `bind:proposalSource` accordingly.

---

## 16. Known Limitations (v1.0)

### 16.1 The Binder Guesses

Its precision and recall are bounded by the quality of its channels: Fandaws terminology coverage (lexical), DKNP tokenization (morphology), SAS evidence (structural), and the law's frame definitions (frameFit) — and, on the enriched path, the proposer model. The architecture's response to fallibility is containment (OCE + commit), not the pretense of reliability.

### 16.2 Genuine Underdetermination Is Not Solvable by Heuristics

A `company` column that could be shipper, carrier, or consignee is not resolvable from schema alone, no matter how many channels converge. The commit gate is the answer; better heuristics are not. The Binder's job here is to *recognize* the ambiguity (flag it) rather than resolve it by guessing.

### 16.3 The Probabilistic Path Is Luciferic-Prone

A language-model proposer can confabulate frames the data does not support. This is mitigated — not eliminated — by the OCE firewall and the commit gate. The risk is *contained* to proposals that must still survive deterministic adjudication and (when ambiguous) human review. No probabilistic proposal is ever asserted on its own authority.

### 16.4 Flat Tables Only (initial)

Consistent with the SAS/ALS/OCE scope, the Binder targets flat tabular frames (one record concept per table). Nested frames await upstream nested-lifting.

### 16.5 The Binder Proposes Symbols, Not Aboutness

It proposes that a column falls under `fan:Driver`; it does not make the symbol refer. Grounding is the OCE/A-Box matter (OCE §3.2). Confidence is heuristic convergence, never lawful warrant.

---

## 17. Appendix A — Worked Example: The Shipment Table, End to End

**Percept (SAS schema):** fields `transportID`, `driverID`, `shipDate`, `originCity`, `destCity`; `transportID`/`driverID` coded-identifiers (high-cardinality, key-shaped); `shipDate` temporal; `originCity`/`destCity` nominal place names.

**DKNP lexis:** `driverID` → head `driver`, `id`-marker (reference); `transportID` → head `transport`, `id`-marker (reference); `shipDate` → head `ship`, `date`-marker (temporal); `originCity` → `origin`, `city`; `destCity` → `dest`, `city`.

**Candidate frames (Fandaws, seeded by topic "shipments" + groundings):** `fan:ActOfShipping` (roles: `hasAgent`, `usesVehicle`, `hasObject`, `hasOrigin`, `hasDestination`, `occupies`), and a weaker competitor `fan:VehicleAssignment`.

**Channel votes for the leading frame `fan:ActOfShipping`:**

| Field → Role | morphology | lexical | structural | frameFit | Convergence |
|---|---|---|---|---|---|
| `driverID → hasAgent` | agree (`driver`≈operator) | agree (`fan:Driver ⊑ fan:Agent`) | agree (reference-shaped) | agree (constitutive role, type fits) | 4/4 |
| `transportID → usesVehicle` | agree | agree (`fan:Truck ⊑ fan:Vehicle`) | agree (reference-shaped) | agree | 4/4 |
| `originCity → hasOrigin` | agree | agree (`fan:City ⊑ fan:Site`) | agree (literal place) | agree | 4/4 |
| `destCity → hasDestination` | agree | agree | agree | agree | 4/4 |
| `shipDate → occupies` | agree | agree (temporal) | agree (temporal) | agree | 4/4 |
| *(no field) → hasObject* | — | — | — | silent | role unfilled |

**Abduction:** coverage = 5/6 ≈ 0.83, residue = 0, mean convergence = 4/4, large margin over `fan:VehicleAssignment` (which leaves origin/destination/temporal unexplained). `frameScore` high → **selected, confidence 0.91, `requiresReview: false`.**

**Output:** a `BindingProposal` whose `proposals[0].proposedBinding` is exactly the OCE input. The OCE adjudicates → verdict **`incomplete`** (the `hasObject` necessity is empty), disposition **assert-partial** (OCE §18, Case 1). The orchestrator builds the ALS `DomainMapping` from the five fulfilled bindings (`driverID`/`transportID` as coded identifiers → object references; `originCity`/`destCity`/`shipDate` per their roles), flags the unwitnessed *goods* necessity, and ALS asserts the warranted facts.

**Contrast — adding a `company` column:** lexical grounds to `fan:Company`, but the frame has multiple company-compatible roles (`operatedBy`/`DistributionCompany`, and — if present — shipper/consignee). The channels converge on *a* binding but **diverge on which role** → `BIND-007`, `requiresReview: true` → routed to the **commit gate**. A curator (or M2M negotiation) commits the company to `operatedBy`, the resolution is optionally promoted into Fandaws so it is settled once, and the now-unambiguous binding proceeds to the OCE. This is the firewall doing its work: the ambiguous frame is *committed to*, never silently asserted.

---

## 18. Appendix B — Channel-to-Component Map

| Channel | Realizing component | Status |
|---|---|---|
| morphology | Deterministic Key Normalization Pipeline (DKNP) v2.1 | Built |
| lexical | Fandaws `resolveTerm` / `getConcept` (T-Box authoring) | Built |
| structural | SAS / BIBSS (`typeDistribution`, cardinality, coded-identifier flags) | Built |
| frameFit | W2Fuel-compiled ontology + Reified Constitutive Relations | Built (RCR through v0.3) |
| topic | Binding context (table name / hint / scope) | Caller-supplied |
| abduction / proposal | `ProposalAdapter` (deterministic ranker, or LLM) | This spec |
| firewall | OCE (`oce-core-01`) | Drafted |
| commit | `CommitGate` (Fandaws curator / M2M) | Adapter boundary |

The Binder is largely an *orchestration* of capabilities you already have — DKNP, Fandaws, SAS, RCR — assembled into convergent evidence, plus one new fallible step (the proposal) that the OCE and the commit gate make safe.

---

## 19. Appendix C — Steinerian / Polarity Note (non-normative)

| Construct | Role |
|---|---|
| The Binder's proposal | Fallible **conjecture** — thinking reaching for a concept to grasp the percept; not yet knowledge. |
| Channel convergence | The discipline that keeps conjecture tethered — multiple independent witnesses agreeing. |
| The probabilistic proposer | The **Luciferic** pole — imaginative fluency, prone to ungrounded frames. |
| The OCE | The **Ahrimanic** pole — cold lawful necessity, prone to mechanism present to nothing. |
| The commit gate / reflexive faculty | The balancing **middle** — where the two poles are held in tension and the binding is freely committed. |
| `requiresReview` / commit | The architecture choosing to *commit* to a frame rather than guess at genuine underdetermination. |

The Binder and the OCE are a polarity that brackets the synthesis: imaginative reach disciplined by lawful necessity. The architecture separates the two error-tendencies so that each corrects the other, and routes what neither can settle to a free, committing middle.

---

## 20. Appendix D — Changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-03-04 | Initial specification. The Semantic Binder as the conjectural proposal layer: multi-channel evidence assembly (morphology via DKNP, lexical via Fandaws, structural via SAS, frameFit via ontology+RCR, topic via context), convergence-weighted role assignment, abductive frame selection by coverage/residue, and confidence-thresholded routing to the OCE or the commit gate. The single sanctioned home for fallible/probabilistic inference in the FNSR semantic stack, with scoped determinism (evidence assembly deterministic; proposal adapter-dependent) and safety derived not from its own determinism but from the OCE firewall and the commit gate. Outputs `ProposedBinding`s exactly as the OCE consumes them; supplies the coded-vs-literal determination ALS needs. Boundary of competence (§3) forbids treating Binder confidence as lawful warrant; the Binder/OCE polarity (Luciferic/Ahrimanic) documented as the architectural separation of cognition's two error-tendencies. |

---

*End of specification.*
