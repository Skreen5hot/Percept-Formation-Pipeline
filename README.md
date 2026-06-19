# Percept-Formation-Pipeline

> Everything from raw bytes up to a structured, adjudicated percept — taking the world as it
> strikes the system's senses and rendering it first a *conceptually mute* percept (the
> fragmentary given that thinking has not yet grasped), then adjudicating that percept against
> a constitutive law and emitting an auditable data dictionary.

A **deterministic, fully client-side** semantic pipeline (browser + Node, **zero network, no
`eval`**). It ingests raw CSV/JSON bytes and carries them, stage by gated stage, from formatting
noise to a typed structural percept, to a conceptual proposal, to a necessity-checked verdict, to
a standards-aligned, content-addressed **Adjudication Manifest**. Every stage is gated: when a
stage cannot honestly proceed it **stops with a named reason** rather than guessing.

**Live demo:** https://skreen5hot.github.io/Percept-Formation-Pipeline/
Runs entirely in your browser — paste data or try the built-in samples (clean, dirty, mislabeled,
clinical, disputed) and watch each stage light up, gate, or stop.

## The epistemic arc

```
raw bytes
   │  -- percept formation (the mute given) --------------
   v
 SNP -> BIBSS -> SAS -> Binder        DKNP (alongside, planned) . Fandaws (consulted)
   │                       │
   │  -- percept meets concept ---------------------------
   v                       v
                          OCE  ->  FSDD
                       (firewall)  (the product: an auditable dictionary)
```

Stages **SNP -> BIBSS -> SAS -> Binder** form the percept the way it is *given* — structured,
typed, but conceptually mute. **OCE** is where percept meets concept: the Binder's conjecture is
adjudicated against a constitutive law, accepted or refused *for a named reason*. **FSDD** projects
the result into a portable, standards-aligned artifact.

## Stages

| Stage | Name | Spec | What it does |
|-------|------|------|--------------|
| **SNP** | Semantic Normalization | `snp-v1.3.md` | Strips formatting artifacts (currency/% symbols, separators, BOM, locale dates) — raw bytes to a cleaned string in the same format. |
| **BIBSS** | Structural Inference | `BIBSS-V1.3-SPEC.md` | Cleaned data to a Canonical Internal Schema Model (CISM): types, nesting, optionality — **name-blind**, no value semantics. |
| **SAS** | Schema Alignment Service | `sas-v2.0.md`, `sas-v2.1-addendum.md` | CISM to a `viz:DatasetSchema` JSON-LD graph (semantic interpretation). Consults Fandaws scope when present; never requires it. |
| **Binder** | Semantic Binder | `binder-core-01-v1_0_0.md` | The **conjectural** layer: multi-channel convergence + abductive frame selection to a frame proposal with explicit confidence. |
| **OCE** | Ontological Constraint Engine | `oce-core-01-v1_0_0.md` | The **deterministic firewall**: adjudicates the proposal against a constitutive law (OWL 2 RL + role-constraint reasoning), with per-necessity justification — each refusal names the axiom it violates. |
| **FSDD** | FNSR Semantic Data Dictionary | — | The **output adapter**: projects per-field engine outputs + OCE-prescribed derivation into a layered, standards-aligned Adjudication Manifest (content-addressed, provenance-bearing). |

**Alongside the main path:**
- **DKNP** — Deterministic Key Normalization Pipeline (`Deterministic-Key-Normalization-Pipeline-v2.1.md`). A feeder that runs alongside SNP/BIBSS; **not yet implemented** in the demo (the pipeline gates it explicitly rather than pretending it ran).
- **Fandaws** — a *consulted* scope resource (`fandaws-scope/`), never a hard dependency.

## Running it

It's a static site — no build step, no server.

- **Hosted:** open the live demo link above.
- **Local:** serve the `docs/` directory with any static file server, e.g.
  ```
  npx serve docs      # or: python -m http.server -d docs
  ```
  then open the printed URL. (Opening `docs/index.html` directly works too, modulo browser
  module-loading rules — a static server is the reliable path.)

Everything executes in the browser; nothing is sent anywhere.

## Repository layout

```
docs/                      The live demo site (GitHub Pages source)
  index.html               UI: input, the stage DAG, per-stage panels
  js/                      Per-stage glue: snp, bibss, sas, binder, oce, fsdd, fandaws, runner, ui
  js/vendor/               The built engine sources each stage runs
  data/                    Sample scope data
specs at repo root         The constitutive spec per stage (SNP, BIBSS, SAS, Binder, OCE, DKNP)
build-provenance/          The IntegratedAgent factory's realization / build / VERIFIED records
fandaws-scope/             The consulted Fandaws scope
```

## Provenance

The engine modules behind these stages were built by the **[IntegratedAgent](https://github.com/Skreen5hot/IntegratedAgent)**
autonomous build factory — each module produced in a network-isolated container, gated by an
independent judge and a spec-anchored execution tier, and verified against a human-pinned
acceptance suite (VERIFIED-grade). The `build-provenance/` records (E3/E4/R01 campaigns) are the
factory's realization, build, and verification artifacts for the cross-stage reconciliations.

## License

[MIT](LICENSE)
