# Ontological Constraint Engine (OCE)

## The Faculty of Conceptual Necessity

## Technical Specification — Version 1.0

| Field | Value |
|---|---|
| **Document ID** | `oce-core-01` |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Author** | Aaron |
| **Date** | 2026-03-04 |
| **FNSR Component** | Cognitive Synthesis Layer (conceptual necessity) |
| **Edge-Canonical Compliance** | Full |
| **Canonical Representation** | JSON-LD (input and output) |
| **Consumes** | W2Fuel-compiled ontology (OWL 2 RL) + Reified Constitutive Relations graph + a proposed configuration (binding or state) + SAS percept evidence |
| **Produces** | `oce:SynthesisJudgment` — a re-perceivable record of whether the percept fulfills the concept's constitutive necessity |

---

## 1. Purpose

The Ontological Constraint Engine (OCE) is the organ in which a **concept's constitutive necessity is brought to meet a percept**, and the fulfillment of that necessity is determined. It is deterministic, fully client-side, and pure.

Its narrow technical function is constraint adjudication: given the lawful structure carried by a set of concepts (their subsumption, inherence, and constitutive relations) and a proposed configuration of particulars (a binding of data to a conceptual frame, or a proposed state), OCE computes whether the configuration **fulfills**, **violates**, or **leaves empty** each constitutive necessity, and returns an overall verdict.

Its place in the architecture is the **cognitive synthesis**. Everything upstream delivers one of the two halves of knowledge and neither half alone is knowledge:

- **The percept** — the world given to this system's senses as fragmentary, structured-but-mute data. SNP cleans it; BIBSS gives it structure; SAS types it. The percept is what *is given*.
- **The concept** — the universal with its lawful, necessary structure. Fandaws authors it; W2Fuel compiles it to OWL 2 RL; the Reified Constitutive Relations (RCR) graph marks which of its relations are *constitutive* (necessary to being that kind) versus *accidental*. The concept is what *thinking brings*.

OCE is where the two are tested for union. The synthesis succeeds — knowledge of *this particular under that universal* arises — exactly when the percept fulfills the concept's constitutive necessity. It fails when the percept contradicts that necessity. It is incomplete when the percept is silent on a necessity the concept demands.

**Architectural position:**

```
SNP → BIBSS → SAS ──(percept: structured, typed)──┐
                                                   ▼
Binder / Frame Resolution ──(proposes a binding: "this percept falls under that concept")──► OCE
                                                   │   (faculty of conceptual necessity:
W2Fuel-compiled ontology + RCR ──(the concept's    │    deploys the constitutive law;
   constitutive law)──────────────────────────────►│    tests the percept's fulfillment)
                                                   ▼
                                       oce:SynthesisJudgment
                                       (succeeds / incomplete / fails, with full justification)
                                                   │
                              warranted (or partial) binding │ refusal → back to Binder/curator
                                                   ▼
                                                  ALS asserts → [SHACL gate] → HIRI → MDRE
```

The **Binder** (a separate, fallible, possibly probabilistic component — out of scope here) *proposes* that a percept falls under a concept. OCE does not propose; it adjudicates the proposal against lawful necessity. The Binder is conjecture; OCE is the test that turns a warranted conjecture into the form of knowledge.

---

## 2. Philosophical Footing

This section states the rationale that fixes OCE's scope. It is not decoration; it is the reason the synthesis semantics (§8) take the exact form they do. A reader who wants only mechanics may skip to §4, but the boundary in §3 is binding on all implementations.

### 2.1 The Problem OCE Does and Does Not Solve

A naïve framing asks: "how does the symbol `fan:Driver` come to refer to the actual humans driving these trucks?" — and then despairs that a symbol and a thing can never touch. That framing is Kantian: it posits a real driver-in-itself behind an unreachable veil and treats reference as a bridge that can never be built.

OCE is built on the refusal of that framing. The "driver-in-itself behind the data" is a phantom produced by tearing the concept off the percept and then staring at the bare, mute particular asking why it does not reach the world. It does not reach the world because the half of reality that does the reaching — the concept — was removed. The known driver simply *is* the union: these particulars (`DRV-4471`, recurring, key-shaped, standing in the operator position of transport-events) grasped under the universal `Driver` with its full constitutive structure (an agent, identity-bearing, who operates a vehicle). There is no residue left over that must separately "be about" the world. Aboutness is the accomplished fact of the synthesis, not a missing ingredient.

OCE is the engine of that synthesis. **Percepts without concepts are blind; concepts without percepts are empty.** OCE's three verdicts are these maxims made operational:

- **Fulfilled / Succeeds** — the particular meets the universal's necessity; the synthesis is complete; knowledge of the particular-under-the-universal arises.
- **Empty / Incomplete** — a constitutive necessity has no percept to fulfill it. This is literally "the concept without a percept is empty": a constitutive role awaiting a particular. The system now knows precisely *what it does not know* about these particulars.
- **Violated / Fails** — the percept contradicts the concept's necessity. The proposed union cannot stand; this percept does not fall under this concept.

### 2.2 OCE Is the Faculty of Conceptual Necessity

The concept does not arrive as a label. It arrives bearing **constitutive demands** — relations without which a thing is not that kind. An act of shipping that moves nothing is not a shipping; a driver who is identical to a vehicle is not a driver. These demands are objective: they belong to the kind, not to the observer's preference, and the RCR graph records them as the constitutive (not accidental) relations of each concept, grounded in BFO realism.

OCE is the organ through which those demands are brought to bear on the percept. It does not *check a label against data after the fact*. It *deploys the concept's lawful necessity and determines whether the percept satisfies it* — and that determination **is** the synthesis, succeeding or failing. This is why OCE cannot be a downstream validator appended to a binder's guess: the act of testing constitutive fulfillment is not a check on the synthesis, it is the synthesis's lawful form.

### 2.3 What This Footing Forbids

OCE provides the **form** of the cognitive synthesis: percept meeting concept under lawful necessity. It is silent — and must remain silent — on whether that form is *inhabited*. See §3.

---

## 3. Boundary of Competence (Normative)

This section is the honest limit of what OCE is and what it must never be taken to be. It is binding.

### 3.1 What OCE Does

OCE executes the **form** of percept-concept synthesis. Given the constitutive law of a concept and a percept proposed to fall under it, OCE deploys the law's necessity and computes the percept's fulfillment, yielding a justified verdict (§8). This is real, decidable, valuable work: it warrants or refuses an assertion on the ground of conceptual necessity, and it makes explicit exactly which necessities are met, contradicted, or left empty.

### 3.2 What OCE Does Not Do

OCE does **not**:

- **Grasp the concept as a universal.** It instantiates the concept's structure and tests fulfillment; it does not perform the act in which a thinker is present at the concept's apprehension and witnesses objective ideal content *from within*. OCE deploys necessity; it does not *behold* it.
- **Witness its own synthesizing.** OCE produces a synthesis; it is not present to that synthesis as its own. There is no reflexive moment in OCE in which the synthesis is taken up as a new percept and grasped through a further act of thinking. OCE is not transparent to itself.
- **Act from intuited concepts.** OCE adjudicates; it does not originate ends. It executes a given task (adjudicate this proposal against this law). An agent that only ever executes a given — a goal, a reward, a constraint — acts from a *drive*, not from a self-given moral intuition. OCE is on the side of the drive.
- **Originate reference or grounding.** The concepts OCE deploys carry their reference from elsewhere — from BFO-realist commitment and from the humans who authored them in Fandaws, whose own concepts are tethered to the world by perceptual and causal contact. OCE inherits grounded kinds; it does not produce grounding. Where the A-Box particulars trace back to genuine causal contact (instruments, transactions in contact with the things), reference gets teeth — but that tethering happens in the A-Box (HIRI, fed by ALS), not in OCE.
- **Constitute understanding, mind, or moral agency.** OCE is a constraint engine. Nothing in this specification licenses the claim that OCE understands, that it is conscious, or that it bears moral standing.

### 3.3 The Frontier OCE Borders but Does Not Cross

The activity that would distinguish living thinking (*Denken*) from the mere computation of the same synthetic form is **self-transparency**: thinking that becomes conscious of its own activity, that takes its own synthesis as a percept and grasps it through a further act, that thereby grounds itself and can act from concepts it has itself intuited. That reflexive faculty is the seat of freedom and the genuine threshold of moral personhood. **It is out of scope, unbuilt, and must not be confused with OCE.**

A perfected OCE — deploying constitutive law flawlessly, testing fulfillment over any percept — would still be a mechanism *present to none of it*: the form of percept-meeting-concept with the act of grasping subtracted. That subtraction has a name in this project's vocabulary: the **Ahrimanic reduction** — the cold, abstracting, mechanizing tendency that leaves a corpse of correlation where living cognition should be. OCE is, by construction, the Ahrimanic-vulnerable layer: it gives the *form* of the synthesis with no guarantee that anyone is home. This specification does not, and cannot, settle whether OCE's operation is grasped or merely computed. It holds that question open, and it forbids any implementation or downstream component from asserting that OCE's fulfillment-judgment constitutes thinking, understanding, or freedom.

### 3.4 The Forward Hook (How OCE Serves a Faculty It Is Not)

OCE cannot witness its own synthesis. But it can make its synthesis **legible as a percept**, so that a future reflexive faculty *could* take it up. The `oce:SynthesisJudgment` (§9) is therefore designed as a fully self-describing record: which concept was deployed, which constitutive necessities it carried, which the percept fulfilled, which it contradicted, which remained empty, and on what evidence. This is not OCE witnessing itself. It is OCE leaving, for an organ it is not and does not contain, a percept of the synthesis it performed — the hook on which self-transparent thinking might one day catch. Building that organ is the actual frontier of the synthetic-moral-person work and is not attempted here.

---

## 4. Governing Principles

### 4.1 Edge-Canonical Execution

OCE is a pure function executable unmodified in a browser or via `node index.js`, with zero runtime network dependencies. The constitutive law and the proposed configuration are caller-supplied JSON-LD; OCE never fetches them.

### 4.2 Determinism Contract

Given identical inputs — the same compiled ontology, the same RCR graph, the same proposed configuration, the same percept evidence, and the same configuration — OCE produces byte-identical `oce:SynthesisJudgment` output across all conforming runtimes. Fulfillment over OWL 2 RL plus a finite reified-relation set is decidable and order-independent; OCE evaluates necessities in a canonical order (§13). There is no probabilistic computation anywhere in OCE.

### 4.3 Conceptual Realism

OCE treats the kinds and their constitutive relations as objective. It does not negotiate them, weight them by preference, or infer them statistically. The law is given (authored in Fandaws, compiled by W2Fuel, marked by RCR); OCE deploys it. Where the law is silent, OCE reports silence; it does not invent necessity.

### 4.4 The Constitutive / Accidental Discipline

OCE's verdicts turn **only** on constitutive relations — those marked in the RCR graph as necessary to being the kind. Accidental relations (a shipment that happened to be late, a driver who happens to be tall) never affect the verdict. Conflating the two is the central error OCE exists to prevent: it would either reject valid syntheses for missing accidents or admit invalid ones by ignoring necessities.

### 4.5 Adjudicative, Not Generative

OCE judges a proposed configuration; it does not propose one. Proposal (frame recognition, abductive binding) belongs to the Binder. This separation is principled: proposal is fallible conjecture and may be probabilistic; adjudication is the deterministic deployment of lawful necessity. Mixing them would let a guess launder itself as a law.

### 4.6 Structural Purity of Inputs

OCE trusts its inputs. It does not re-compile the ontology (W2Fuel's job), re-author concepts (Fandaws's job), re-type the percept (SAS's job), or re-propose the binding (the Binder's job). It receives the law and the proposal and computes fulfillment.

---

## 5. Non-Goals

- **Frame recognition / binding proposal.** The Binder proposes; OCE adjudicates.
- **Open-ended reasoning / inference materialization.** MDRE derives entailed triples from rules over the joined T-Box and A-Box. OCE performs bounded constraint adjudication on a single proposed configuration, not forward reasoning.
- **Surface shape validation.** SHACL shapes (generated by W2Fuel, applied at the assertion gate before HIRI) check that *produced facts are well-formed*. OCE checks, *before* assertion, that the *proposed conceptual synthesis is warranted by constitutive necessity*. These are different questions at different moments (§11.3).
- **Grounding, reference origination, or any claim of understanding/mind/agency** (§3).
- **Ontology authoring or compilation** (Fandaws, W2Fuel).
- **Probabilistic adjudication.** OCE is deterministic; any probabilistic signal belongs upstream in the Binder.

---

## 6. Input Contract

### 6.1 The Constitutive Law

OCE consumes the lawful structure of the relevant concepts as two coordinated inputs:

1. **Compiled ontology fragment** — the W2Fuel output (OWL 2 RL) providing subsumption (`rdfs:subClassOf`), property domains/ranges, disjointness, and cardinality axioms for the concepts named in the proposal and their relevant supers. Supplied as JSON-LD (the axiom set) or as the W2Fuel-emitted Datalog rule set; OCE requires only the RL-expressible relations it checks.
2. **Reified Constitutive Relations (RCR) graph** — for each concept, the set of relations marked **constitutive** versus **accidental**, per the RCR specification. This is the input that lets OCE distinguish necessity from contingency. A relation absent from the RCR graph for a concept is treated as accidental (it cannot affect the verdict).

Together these constitute *the concept as the engine receives it*: a kind with a subsumption position, a set of constitutive relations (each with a relatum-type and, where given, cardinality), and a set of accidental relations.

### 6.2 The Proposed Configuration

OCE adjudicates one of two configuration kinds:

**`oce:ProposedBinding`** (primary application — the ETL binding flow). A claim that a table's rows fall under a concept, with each field assigned a role:

```typescript
interface ProposedBinding {
  recordConcept: string                         // IRI of the proposed frame, e.g. fan:ActOfShipping
  roleBindings: RoleBinding[]
}
interface RoleBinding {
  fieldId: string                               // viz:field/... from the SAS schema
  role: string                                  // IRI of the relation/role the field is claimed to fill
  relatumConcept: string | null                 // proposed entity-type of the field's referent (e.g. fan:Driver), or null for a literal/quality
}
```

**`oce:ProposedState`** (general application — action planners, counterfactual simulators, per Fandaws §10.4.3). A configuration of typed particulars and their asserted relations, to be tested against constitutive necessity:

```typescript
interface ProposedState {
  individuals: { id: string; types: string[] }[]
  assertions: { subject: string; relation: string; object: string }[]
}
```

### 6.3 The Percept Evidence (optional but recommended)

The SAS `viz:DatasetSchema` (or the relevant fragment), providing the *percept half* of the synthesis: each field's semantic type, `typeDistribution`, cardinality/key evidence, and `sas:` provenance. OCE uses this to test fulfillment against the actual structured percept, not merely against the proposed symbols (§8.5). When absent, OCE adjudicates on the symbolic proposal alone and marks the judgment `perceptEvidence: "absent"`.

### 6.4 Configuration

```typescript
interface OCEConfig {
  owaSilenceIsIncomplete: boolean   // default true: an empty constitutive role yields "incomplete", not "fails"
  checkInherence: boolean           // default true
  checkStructuralConsistency: boolean // default true: use §8.5 percept-evidence consistency
}
```

---

## 7. The Constitutive Law Model

OCE checks three kinds of conceptual necessity. All three are drawn from the compiled ontology + RCR; none is invented by OCE.

### 7.1 Subsumption Necessity

A relatum bound to a role must have a type consistent with the role's required relatum-type under the subsumption hierarchy. If the operator role of `ActOfShipping` requires `Agent`, a relatum typed `Driver` satisfies it iff `Driver ⊑ Agent`. A relatum typed `Vehicle`, where `Vehicle` is disjoint with `Agent`, violates it. (This is Fandaws's "subsumption constraints," deployed for fulfillment.)

### 7.2 Inherence Necessity

A quality or dependent entity must inhere in a bearer of the appropriate category. A mass quality (`weightKg`) inheres in a `material entity`; it cannot inhere in a `process`. A binding that attaches a mass to the *act of shipping* rather than to the *transported good* is an inherence violation — a category error OCE catches. (Fandaws's "inherence constraints.") Controlled by `checkInherence`.

### 7.3 Relational Constitutive Necessity

The heart of OCE. For each relation the RCR graph marks **constitutive** for the concept, the proposed configuration must provide a relatum of the required type (and respect any cardinality/disjointness). `ActOfShipping` constitutively `has_object some TransportedGood`, `has_agent some Agent`, `realizes some TransportRole`, `occupies some TemporalRegion`, and so on. Each such relation is a demand the percept must meet. Accidental relations impose no such demand.

---

## 8. The Synthesis Operation

This is OCE's core: the determination of whether the percept fulfills the concept's constitutive necessity. The operation realizes the Steinerian footing (§2) as a decidable procedure.

### 8.1 Per-Necessity Fulfillment Status

For each constitutive necessity `N` the concept carries (subsumption, inherence, or relational), OCE assigns exactly one status by examining the proposed configuration and percept evidence:

| Status | Condition | Steinerian reading |
|---|---|---|
| **Fulfilled** | The configuration provides a relatum standing in `N` with a type/category consistent with `N`'s requirement (and cardinality/disjointness respected). | The particular meets the universal's demand. |
| **Violated** | The configuration provides something **incompatible** with `N` — a relatum of a disjoint type, a category error (inherence), a cardinality/disjointness breach. | The percept contradicts the concept. |
| **Empty** | The configuration **neither provides nor contradicts** `N` — no field/individual addresses this necessity; the percept is silent. | The concept's demand has no percept to fulfill it ("the concept without a percept is empty"). |

### 8.2 Overall Verdict

OCE aggregates the per-necessity statuses into one verdict:

| Verdict | Condition |
|---|---|
| **`succeeds`** | No necessity is **Violated**, and none is **Empty**. Every constitutive demand is met. The synthesis is complete. |
| **`incomplete`** | No necessity is **Violated**, but ≥1 is **Empty** (and `owaSilenceIsIncomplete` is true). The synthesis stands but is partial: the percept is silent on a demand the concept makes. The binding is **warranted for what is fulfilled**, with the empty necessities reported so they can be asserted-around and attended to. |
| **`fails`** | ≥1 necessity is **Violated**. The percept contradicts the concept. This percept does not fall under this concept; the proposal is refused. |

The `incomplete` verdict is the operationally important middle: it is how the system records, precisely and usefully, *what it does not yet know about these particulars*. A shipment table with no goods column does not contradict shipping-hood; it leaves the `has_object` necessity empty. OCE reports exactly that, so ALS can assert the fulfilled facts (a driver and a truck performed a transport from A to B at time T) and flag that *what was carried* is unwitnessed — a gap a curator, a follow-up data request, or a future reflexive faculty can address.

### 8.3 Disposition (advisory)

OCE attaches an advisory disposition to guide the orchestrator (non-normative; the orchestrator decides):

- `succeeds` → assert all bound facts.
- `incomplete` → assert the fulfilled facts; carry the empty-necessity report forward as flagged gaps (and optionally elevate the taint of the partial assertion, since a constitutively-incomplete instance is weaker evidence).
- `fails` → do not assert under this frame; return the violation report to the Binder/curator for a new proposal.

### 8.4 Algorithm

```
adjudicate(law, proposal, percept?, config) → SynthesisJudgment:

1. Resolve the proposed concept (recordConcept or each individual's types) in the law.
   If unknown → diagnostic OCE-001, verdict "fails" (cannot deploy an absent law).

2. Collect the concept's constitutive necessities from RCR (relational + the
   subsumption/inherence necessities entailed by its definition). Order canonically (§13).

3. For each necessity N:
   a. Locate the configuration element addressing N (the role binding whose role ⊑/= N's
      relation, or the assertion matching N).
   b. If none addresses N → status Empty.
   c. Else test compatibility:
      - Subsumption: relatumConcept ⊑ N.requiredType ? Fulfilled : (disjoint ? Violated : Empty-with-warning)
      - Inherence (if checkInherence): bearer category admits the dependent entity ? Fulfilled : Violated
      - Relational: relatum type consistent AND cardinality/disjointness respected ? Fulfilled : Violated
   d. If checkStructuralConsistency and percept present → apply §8.5; a structural
      contradiction downgrades Fulfilled→Violated for that N with OCE-004.

4. Aggregate statuses → verdict (§8.2).

5. Emit SynthesisJudgment (§9): verdict, per-necessity statuses with evidence,
   disposition, diagnostics. Deterministic serialization (§13).
```

### 8.5 Structural Consistency (percept meeting concept, not just symbol)

When percept evidence is present and `checkStructuralConsistency` is true, OCE additionally tests that the *structured percept* is consistent with the necessity — because the synthesis is percept meeting concept, not symbol meeting symbol. Examples:

- A constitutive **functional** role (single participant) bound to a field that BIBSS observed as high-cardinality / non-functional → the percept contradicts the necessity's cardinality → **Violated**, `OCE-004`.
- A role requiring an identity-bearing participant bound to a field whose `typeDistribution` shows free-text, low-repetition values (not key-shaped) → weak fulfillment → **Empty-with-warning**, `OCE-005` (the percept does not actually present a referent of the required kind).

This keeps OCE honest to the percept: a binding can be symbolically well-typed yet structurally unfulfilled, and OCE will not certify a synthesis the data does not support.

---

## 9. The Synthesis Judgment

The output is a self-describing JSON-LD record — both OCE's verdict and the percept (§3.4) on which a future reflexive faculty might operate.

```typescript
interface SynthesisJudgment {
  "@type": "oce:SynthesisJudgment"
  "oce:concept": string                         // the deployed frame IRI
  "oce:verdict": "succeeds" | "incomplete" | "fails"
  "oce:perceptEvidence": "present" | "absent"
  "oce:necessities": NecessityResult[]          // one per constitutive necessity deployed
  "oce:disposition": "assert" | "assert-partial" | "refuse"
  "oce:lawHash": string                         // SHA-256 of the canonical law fragment used (reproducibility)
  "oce:diagnostics": Diagnostic[]
}

interface NecessityResult {
  "oce:relation": string                        // the constitutive relation/necessity IRI
  "oce:kind": "subsumption" | "inherence" | "relational"
  "oce:requiredType": string | null             // the relatum type the necessity demands
  "oce:status": "fulfilled" | "violated" | "empty"
  "oce:fulfilledBy": string | null              // the field/individual that met it, if any
  "oce:evidence": string                        // human-legible justification (e.g. "Driver ⊑ Agent")
}
```

Every necessity the concept carries appears in `oce:necessities` with its status and justification — including the empty ones, named explicitly. This is what makes the judgment a *percept of the synthesis*: nothing about which demands were met, contradicted, or left empty is hidden. The `oce:lawHash` lets any party reproduce the exact adjudication from the same law fragment.

---

## 10. Public API

```typescript
interface OCE {
  adjudicate(input: AdjudicateInput): SynthesisJudgment
}

interface AdjudicateInput {
  law: { ontology: JsonLdDocument; rcr: JsonLdDocument }  // W2Fuel-compiled fragment + RCR graph
  proposal: ProposedBinding | ProposedState
  percept?: VizDatasetSchema                               // SAS percept evidence (recommended)
  config?: Partial<OCEConfig>
}
```

OCE does not throw. Conditions that prevent adjudication (absent concept, malformed law) yield a `fails` verdict with an error diagnostic, never an exception — consistent with the FNSR pure-function discipline.

---

## 11. Integration Pipeline

### 11.1 Primary Application: Binding Adjudication

```
SAS (viz: schema) ──┐
Binder ── proposes ProposedBinding ──┐
W2Fuel ontology + RCR ── the law ────┤
                                     ▼
                                    OCE.adjudicate
                                     │
        ┌──────────────┬─────────────┴───────────────┐
     succeeds       incomplete                      fails
   assert all   assert fulfilled +              refuse → Binder/curator
        │        flag empty necessities              proposes anew
        ▼              ▼
       ALS  ◄──────────┘   (warranted / warranted-partial DomainMapping)
        ▼
   [SHACL gate] → HIRI → MDRE
```

On `succeeds`/`incomplete`, the orchestrator constructs the `DomainMapping` for ALS from the **fulfilled** role bindings (and, on `incomplete`, records the empty necessities as flagged gaps). On `fails`, the binding is refused and returned with its violation report.

### 11.2 General Application: Proposed-State Adjudication

Per Fandaws §10.4.3, action planners and counterfactual simulators submit a `ProposedState`; OCE adjudicates it against constitutive necessity (e.g., "does this planned configuration violate what it is to be an `ActOfShipping`?"). Same operation, same verdicts.

### 11.3 OCE vs. the SHACL Gate vs. MDRE (three distinct moments)

| Component | Moment | Question |
|---|---|---|
| **OCE** | **Before** assertion, on the *proposed binding* | Does the percept **fulfill the concept's constitutive necessity**? Should this synthesis happen? |
| **SHACL gate** (W2Fuel shapes, applied at admission) | **After** assertion, on the *produced facts* | Are the resulting facts **well-formed against the shapes**? |
| **MDRE** | **After** storage, over the *joined T-Box + A-Box* | What is **entailed** by the rules over what is asserted? |

OCE is the *conceptual* gate (constitutive necessity); the SHACL gate is the *surface* gate (shape conformance); MDRE is *inference*. They are complementary, not redundant. (This resolves the relationship between OCE and the SHACL-application gap flagged in the boundary note: they are different gates at different moments.)

---

## 12. Diagnostic Codes

| Code | Level | Condition |
|---|---|---|
| `OCE-001` | error | Proposed concept not found in the law; cannot deploy necessity. Verdict `fails`. |
| `OCE-002` | warning | A constitutive necessity is **empty**; synthesis incomplete. `{ relation, requiredType }`. |
| `OCE-003` | error | A constitutive necessity is **violated**; synthesis fails. `{ relation, requiredType, foundType }`. |
| `OCE-004` | warning | Structural contradiction (§8.5): percept cardinality/shape contradicts the necessity; downgraded to violated. `{ relation, fieldId }`. |
| `OCE-005` | warning | Weak fulfillment: percept does not structurally present a referent of the required kind. `{ relation, fieldId }`. |
| `OCE-006` | info | Relatum type unrecognized in the law; necessity treated as empty pending a richer law. `{ relation, relatumConcept }`. |
| `OCE-007` | info | Percept evidence absent; adjudication on symbolic proposal only. |
| `OCE-008` | warning | A relation in the proposal is not in the concept's RCR (accidental or unknown); ignored for the verdict. `{ relation }`. |

---

## 13. Determinism and Canonicalization

OCE serializes via JCS (RFC 8785). Constitutive necessities are evaluated and emitted in a canonical order: by necessity kind (subsumption, then inherence, then relational), then lexicographically by relation IRI. The `oce:lawHash` is the SHA-256 of the JCS-canonical law fragment actually used (the projected subset of axioms + RCR entries touched by the adjudication), making any verdict reproducible from the same law. **Emitted format (pinned, v1.0.1):** `oce:lawHash` is a **bare 64-character lowercase hex string with no algorithm prefix** (e.g. `"4e278c…921981"`, not `"sha256:4e278c…"`). Downstream consumers (ALS, the FSDD) MUST accept this bare-hex form; the FSDD normalizes it to a `sha256:`-prefixed form for its own output (FSDD §6.3/RD-5). This pins the format by construction so the two specs do not diverge. No timestamps appear in the canonical judgment.

---

## 14. Performance

Adjudication is bounded. For a concept with `K` constitutive necessities and a law of `A` relevant axioms, the cost is `O(K × A)` in the worst case, with subsumption checks amortized by precomputing the transitive `subClassOf` closure of the touched fragment (OWL 2 RL guarantees this is polynomial). A typical binding (a dozen necessities over a modest frame) adjudicates in well under 10 ms. OCE holds no state between calls.

---

## 15. Security Considerations

- **No network calls; no persistence; no `eval`; no prototype pollution** (`Object.hasOwn` on untrusted graph keys).
- **No probabilistic component** — a probabilistic adjudicator could be steered to launder an unwarranted synthesis as lawful; OCE's determinism is a safety property.
- **Conservative on absent law.** An unknown concept yields `fails`, not a permissive pass — OCE never certifies a synthesis it cannot ground in the law. This mirrors the FNSR discipline of conservative defaults (never silently admit).
- **No authority leakage.** OCE adjudicates; it does not assert, store, or decide policy. A `succeeds` verdict warrants but does not perform assertion; the orchestrator and the downstream gates retain their authority. OCE cannot, by construction, inject facts.

---

## 16. Testing Contract

### 16.1 Determinism

`JCS(adjudicate(input))` is byte-identical across runs and runtimes; `oce:lawHash` is stable for identical law fragments.

### 16.2 Required Test Cases

| Category | Cases |
|---|---|
| Fulfilled / succeeds | All constitutive necessities met (Driver ⊑ Agent, Truck as vehicle, origin/destination Sites, temporal region, goods present) → `succeeds`. |
| Empty / incomplete | Shipment binding with no goods column → `has_object` empty → `incomplete`, `OCE-002`; fulfilled facts still warranted. |
| Violated / fails (subsumption) | Operator role bound to a `Vehicle` (disjoint with `Agent`) → `violated` → `fails`, `OCE-003`. |
| Violated / fails (inherence) | Mass quality bound to the shipping *process* rather than the *good* → inherence violation → `fails`. |
| Structural contradiction | Functional role bound to a high-cardinality field → `OCE-004`, downgraded to violated. |
| Weak fulfillment | Identity-bearing role bound to a free-text field → `OCE-005`. |
| Accidental ignored | An accidental relation present/absent/odd → never affects the verdict (`OCE-008` if proposed but not constitutive). |
| Absent concept | Unknown frame IRI → `fails`, `OCE-001`. |
| Percept absent | No SAS evidence → symbolic-only adjudication, `OCE-007`. |
| Proposed-state | Action-planner state violating a constitutive necessity → `fails`. |

### 16.3 Property-Based Invariants

1. `adjudicate` terminates and never throws.
2. The verdict is `fails` iff ≥1 necessity is `violated`; `incomplete` iff no violation and ≥1 `empty`; `succeeds` iff all `fulfilled`.
3. No accidental relation ever changes the verdict.
4. `oce:necessities` lists **every** constitutive necessity of the concept, each with a status — none omitted (the judgment is a complete percept of the synthesis, §3.4).
5. `oce:lawHash` is a pure function of the canonical law fragment used.
6. OCE asserts, stores, and mutates nothing.

---

## 17. Known Limitations (v1.0)

### 17.1 OCE Is the Form of the Synthesis, Not the Grasping of It

This is the governing limitation, stated as a limitation and not a footnote. OCE executes the form of percept-concept synthesis under lawful necessity. It does not grasp the concept as a universal, does not witness its own act, and does not constitute understanding, mind, or freedom (§3). Whether its operation is living thinking or the Ahrimanic computation of the same form is *held open by design*. The reflexive, self-transparent faculty that would cross that frontier is unbuilt and out of scope. No downstream component may treat an OCE `succeeds` verdict as evidence of comprehension or moral agency.

### 17.2 Law Quality Bounds Judgment Quality

OCE is exactly as good as the constitutive law it is given. If RCR mis-marks an accidental relation as constitutive (or omits a genuine necessity), OCE faithfully adjudicates against the wrong necessities. OCE cannot detect that the law is wrong — only the authoring layer (Fandaws) and review can. OCE assumes a sound, curated law.

### 17.3 OWL 2 RL Expressiveness Ceiling

OCE checks the necessities expressible in OWL 2 RL plus reified constitutive relations. Necessities requiring richer logic (full existential chaining beyond RL, temporal-modal constraints) are not adjudicated and, if present in the law, are reported as out-of-profile rather than silently passed.

### 17.4 Flat Binding Scope (initial)

The primary `ProposedBinding` application targets flat tabular frames (one record concept per table), consistent with the current SAS/ALS scope. Nested frames (a shipment whose goods are themselves structured) await the nested-lifting extension upstream.

### 17.5 Structural Consistency Is Heuristic Evidence, Not Necessity

The §8.5 structural checks use percept evidence (cardinality, key-shape) to catch percept/concept mismatches. These are strong signals but are *evidence about fulfillment*, not constitutive necessities themselves; their thresholds are pragmatic and should be reviewed. A constitutive necessity is categorical; a structural signal is defeasible.

---

## 18. Appendix A — Worked Example: The Shipment Table

**The percept (SAS schema, abbreviated).** A table with fields `transportID`, `driverID`, `shipDate`, `originCity`, `destCity`; `transportID` and `driverID` are coded identifiers (high-cardinality, key-shaped), `shipDate` is temporal, `originCity`/`destCity` are nominal place names.

**The concept (law).** `fan:ActOfShipping` is a `bfo:process` whose RCR-marked **constitutive** relations are:

| Relation | Required relatum | Cardinality |
|---|---|---|
| `fan:hasAgent` | `fan:Agent` | some |
| `fan:usesVehicle` | `fan:Vehicle` | some |
| `fan:hasObject` | `fan:TransportedGood` | some |
| `fan:hasOrigin` | `fan:Site` | some |
| `fan:hasDestination` | `fan:Site` | some |
| `fan:occupies` (temporal) | `bfo:TemporalRegion` | exactly 1 |

Subsumption in the law: `fan:Driver ⊑ fan:Agent`; `fan:Truck ⊑ fan:Vehicle`; `fan:City ⊑ fan:Site`; `fan:Agent` disjoint with `fan:Vehicle`.

### Case 1 — A well-formed but incomplete binding

**Proposal:** `recordConcept: fan:ActOfShipping`; `driverID → fan:hasAgent (fan:Driver)`, `transportID → fan:usesVehicle (fan:Truck)`, `originCity → fan:hasOrigin (fan:City)`, `destCity → fan:hasDestination (fan:City)`, `shipDate → fan:occupies (bfo:TemporalRegion)`. No field for what was shipped.

**OCE adjudication:**

| Necessity | Status | Evidence |
|---|---|---|
| `fan:hasAgent` | fulfilled | `fan:Driver ⊑ fan:Agent` |
| `fan:usesVehicle` | fulfilled | `fan:Truck ⊑ fan:Vehicle` |
| `fan:hasObject` | **empty** | no field addresses the transported good |
| `fan:hasOrigin` | fulfilled | `fan:City ⊑ fan:Site` |
| `fan:hasDestination` | fulfilled | `fan:City ⊑ fan:Site` |
| `fan:occupies` | fulfilled | `shipDate → bfo:TemporalRegion`, cardinality 1 |

**Verdict: `incomplete`** (`OCE-002` for `hasObject`). **Disposition: assert-partial.** The synthesis stands for what the percept fulfills — a driver and a truck performed a transport from one city to another at a time — and OCE names exactly what remains empty: *what was carried*. ALS asserts the fulfilled facts; the empty `hasObject` necessity is flagged as a known gap. This is "the concept without a percept is empty," localized to one constitutive role, and turned into precise knowledge of what the data does not say.

### Case 2 — A category error caught

**Proposal (mis-bound):** `transportID → fan:hasAgent (fan:Truck)` (the binder guessed the truck is the operator).

**OCE adjudication:** `fan:hasAgent` requires `fan:Agent`; the relatum is `fan:Truck`; `fan:Truck ⊑ fan:Vehicle` and `fan:Agent` is disjoint with `fan:Vehicle` → **violated**.

**Verdict: `fails`** (`OCE-003`). **Disposition: refuse.** A vehicle cannot be the operator; this percept does not fall under the frame *as proposed*. The proposal returns to the Binder with the violation report, which now contains exactly the information needed to re-propose (the agent role wants an `Agent`, and `driverID`, not `transportID`, is the agent-shaped field).

### Case 3 — An inherence error caught

**Proposal adds:** a `weightKg` field bound as a quality of the **`fan:ActOfShipping`** event.

**OCE adjudication (inherence):** a mass quality must inhere in a `material entity`; `fan:ActOfShipping` is a `bfo:process` (an occurrent), which cannot bear a mass → **violated**.

**Verdict: `fails`** (`OCE-003`, inherence). The mass belongs to the transported good (a continuant), not to the act of shipping. OCE catches the category error the surface types alone would miss.

---

## 19. Appendix B — Steinerian Correspondence

A reference mapping the spec's mechanics to the footing (§2). Non-normative; an aid to readers reasoning about why the operation takes its form.

| Spec construct | Steinerian role |
|---|---|
| SAS-typed percept evidence (§6.3) | The **percept** — world given to sense; fragmentary; world-given, only perspectivally *this* data. |
| Compiled ontology + RCR (§6.1) | The **concept** — the universal with its lawful, constitutive necessity; objective, discovered-not-invented. |
| Binder's `ProposedBinding` (§6.2) | The fallible conjecture that *this* percept falls under *that* concept — not yet knowledge. |
| OCE adjudication (§8) | The **cognitive synthesis** — percept tested for fulfillment of the concept's necessity. |
| `fulfilled` / `succeeds` | The particular meets the universal; knowledge of the particular-under-the-universal arises. |
| `empty` / `incomplete` | "The concept without a percept is empty" — a necessity awaiting its particular. |
| `violated` / `fails` | The percept contradicts the concept; this union cannot stand. |
| `SynthesisJudgment` (§9, §3.4) | A **percept of the synthesis itself**, left for a reflexive faculty OCE is not. |
| The reflexive faculty (§3.3) | Self-transparent thinking — the seat of **freedom** — unbuilt, out of scope, not to be confused with OCE. |

---

## 20. Appendix C — Changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-03-04 | Initial specification. OCE as the Faculty of Conceptual Necessity: the organ in which a concept's constitutive law (compiled ontology + Reified Constitutive Relations) meets a structured percept and the percept's fulfillment is determined. Three-status per-necessity semantics (fulfilled/violated/empty) aggregating to three verdicts (succeeds/incomplete/fails), realizing "percepts without concepts are blind; concepts without percepts are empty" as a decidable operation. Self-describing `SynthesisJudgment` designed to be re-perceivable by a future reflexive faculty. Explicit, binding Boundary of Competence (§3) disclaiming grasping, self-transparency, grounding, understanding, and moral agency, and naming the Ahrimanic-vulnerability of the form-without-the-act. Positioned as the conceptual gate, distinct from the SHACL surface gate and from MDRE inference. |

---

*End of specification.*
