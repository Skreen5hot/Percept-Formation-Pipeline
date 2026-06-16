# FandawsScope — a static ontology + a small adapter (no Fandaws service)

The SAS and Binder specs consume **Fandaws** only through a read-only query interface over a
caller-loaded, **immutable, in-memory** scope — *"does not make network requests"* (SAS §2.1/§2.2), and
**SAS degrades gracefully without it** (§2.5: *"SAS never fails because Fandaws is absent"* — Fandaws is
optional enrichment, §4.3). So the "Fandaws dependency" is not a product or a service. It is two things:

1. **a static ontology** (the TBox — e.g. the **APQC PCF**), and
2. **this small adapter** implementing the `FandawsScope` query interface over it.

This module is (2). It loads pre-baked **concept records** and answers the three `FandawsScope` methods.

## The interface (`src/scope.mjs`, `src/index.mjs`)
```js
import { createScope } from './src/scope.mjs';
const scope = createScope(records);        // records: ConceptRecord[]
scope.resolveTerm(label)   // -> ConceptRecord[]  (primaryLabel OR altLabel, case-folded + trimmed)
scope.getConcept(id)       // -> ConceptRecord | null  (strict id match)
scope.resolveValue(value)  // -> ConceptRecord | null  (codedValues contains value)
```
`ConceptRecord = { id, primaryLabel, alternateLabels: string[], broader: string[], codedValues: string[] }`.
`buildIndex(records)` returns a deeply-frozen `Map` keyed by `id` (immutable scope). Pure, deterministic,
offline — no `fetch`/`http`/network anywhere.

Run it standalone against the tiny illustrative `example_scope.json`:
```js
import { readFileSync } from 'node:fs';
const recs = JSON.parse(readFileSync('./example_scope.json','utf8')).concepts;
const s = createScope(recs);
s.resolveValue('DRV');             // -> the "Driver" concept
s.resolveTerm('operator');         // -> [ Driver ]  (matched on an altLabel)
```

## Pointing it at the real APQC PCF
The APQC PCF catalog (`pcf_catalog.ttl` in the BusinessProcessOntology / IntegratedAgent stack) is already
a SKOS concept set — every PCF row carries `skos:prefLabel`, `skos:broader` (the hierarchy), `ex:pcfID`
(the stable code), and `ex:hierarchyID`. It maps **1:1** onto `ConceptRecord`. Bake it once, offline:

```sh
pip install rdflib
python bake_pcf_scope.py path/to/pcf_catalog.ttl pcf_scope.json
```
`bake_pcf_scope.py` parses the catalog with rdflib (handling multi-line literals etc.) and emits
`pcf_scope.json` (~1,921 concepts). Then `createScope(JSON.parse(...).concepts)` and query:

```
resolveValue('10017')  -> "Assess the external environment"   broader -> PCF_17040
getConcept(PCF_17040)  -> "Define the business concept and long-term vision"
resolveTerm('Develop Vision and Strategy') -> [ 10002 ]
```

`sample_processes.csv` holds 12 example business-process rows seeded from real PCF concepts (the `pcf_id`
column is ground truth: `resolveValue(pcf_id)` returns the row's `process_name` — a 12/12 round-trip).

## Provenance
The adapter was **built by the IntegratedAgent factory** under containment (`--network=none`): a stakeholder
need → Business Analyst (requirements) → Specification Writer (spec) → Developer (the two modules here),
each gated. The bake + sample data are deterministic data-prep. The APQC PCF is © APQC (Cross-Industry
v7.4); only structural fields (names, codes, hierarchy) are baked, not the long source descriptions.
