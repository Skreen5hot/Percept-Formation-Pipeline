"""Bake an APQC PCF catalog (.ttl) into a FandawsScope concept-scope JSON the adapter loads.

Deterministic, offline. Parses the catalog with rdflib and emits concept records
{id, primaryLabel, alternateLabels, broader, codedValues} -- the shape src/scope.mjs consumes. The .ttl
is the source of truth; this is the "static ontology -> Fandaws-like record" transform.

  python -m pip install rdflib
  python bake_pcf_scope.py <path/to/pcf_catalog.ttl> [out.json]

The APQC PCF catalog (every PCF row as a skos:Concept with skos:prefLabel, skos:broader, ex:pcfID,
ex:hierarchyID) is generated in the BusinessProcessOntology / IntegratedAgent stack; point this at it.
"""
import sys
import json

import rdflib
from rdflib import RDF
from rdflib.namespace import SKOS

EX = rdflib.Namespace("http://example.org/apqc#")


def bake(ttl_path: str) -> dict:
    g = rdflib.Graph()
    g.parse(ttl_path, format="turtle")
    concepts = []
    for s in sorted(set(g.subjects(RDF.type, SKOS.Concept)), key=str):
        pref = g.value(s, SKOS.prefLabel)
        if pref is None:
            continue
        concepts.append({
            "id": str(s),
            "primaryLabel": str(pref),
            "alternateLabels": sorted(str(a) for a in g.objects(s, SKOS.altLabel)),
            "broader": sorted(str(b) for b in g.objects(s, SKOS.broader)),
            "codedValues": sorted(str(c) for c in g.objects(s, EX.pcfID)),
            "hierarchyID": str(g.value(s, EX.hierarchyID) or ""),
        })
    return {"codedValuePredicate": str(EX.pcfID), "concepts": concepts}


def main(argv):
    if len(argv) < 2:
        print(__doc__); return 2
    out = bake(argv[1])
    dest = argv[2] if len(argv) > 2 else "pcf_scope.json"
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"baked {len(out['concepts'])} concepts -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
