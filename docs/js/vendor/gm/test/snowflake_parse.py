"""Layer-4 verification of the SNOWFLAKE front: parse the SERIALIZED Turtle through a real RDF parser (rdflib)
and assert the FOUR per-subject hop outcomes IN THE PARSED BYTES -- not the in-memory triple array. This is the
GM-arc lesson applied to the wiring: the assertion channel must be the bytes the user actually receives.
BFO/CCO re-grounding: the hop is fan:hasShipToParty (designates) to a fan:Party consignee; a dangling hop
re-seats onto fsdd:hasUnresolvedRole (never the fan: slot, #3).

  node snowflake.emit.mjs > snowflake-graph.ttl
  python snowflake_parse.py snowflake-graph.ttl
"""
import sys
import rdflib

g = rdflib.Graph()
g.parse(sys.argv[1], format="turtle")

FAN = rdflib.Namespace("https://fandaws.dev/concept/")
FSDD = rdflib.Namespace("https://fnsr.dev/fsdd#")
D = rdflib.Namespace("https://fnsr.dev/data/")
RDF = rdflib.RDF

fails = []
def ok(c, m):
    if not c:
        fails.append(m)

print(f"rdflib parsed {len(g)} triples")

# COREFERENCE: SI1 ship-to is the SAME node as the orderer (Party/C1), across a 1-hop and 2-hop path
si1 = list(g.objects(D["ShipInfo/SI1"], FAN.hasShipToParty))
ordc = list(g.objects(D["ActOfOrdering/ord-10"], FAN.hasOrderer))
ok(si1 == [D["Party/C1"]] and ordc == [D["Party/C1"]],
   "coreference: SI1 ship-to == the orderer Party/C1 (one node, two paths)")
ok(len(list(g.subjects(RDF.type, FAN.Party))) >= 1 and (D["Party/C1"], RDF.type, FAN.Party) in g,
   "coreference: Party/C1 typed fan:Party in the parsed bytes")

# DIVERGENT: SI9 -> Party/C2, a distinct node
ok(list(g.objects(D["ShipInfo/SI9"], FAN.hasShipToParty)) == [D["Party/C2"]]
   and (D["Party/C2"], RDF.type, FAN.Party) in g,
   "divergent: SI9 ship-to == a DISTINCT node Party/C2")

# NON-EMISSION: SI2 present + typed, NO hasShipToParty, ONLY its type triple (no ICE, no marker)
ok((D["ShipInfo/SI2"], RDF.type, FAN.ShipInfo) in g, "non-emission: ShipInfo/SI2 present + typed")
ok(len(list(g.objects(D["ShipInfo/SI2"], FAN.hasShipToParty))) == 0, "non-emission: SI2 has NO hasShipToParty edge")
ok(len(list(g.predicate_objects(D["ShipInfo/SI2"]))) == 1, "non-emission: SI2 carries ONLY its type triple (no ICE/marker)")

# UNRESOLVED: SI3 -> UnresolvedRole re-seated off the fan: slot, reason broken-ref, NEVER typed Party; ShipInfo survives
ok(len(list(g.objects(D["ShipInfo/SI3"], FAN.hasShipToParty))) == 0, "unresolved: SI3 has NO fan:hasShipToParty edge (re-seated, #3)")
u = list(g.objects(D["ShipInfo/SI3"], FSDD.hasUnresolvedRole))
ok(len(u) == 1 and (u[0], RDF.type, FSDD.UnresolvedRole) in g, "unresolved: SI3 -> an UnresolvedRole node via fsdd:hasUnresolvedRole")
ok(len(u) == 1 and (u[0], RDF.type, FAN.Party) not in g, "unresolved: NOT typed fan:Party (Traversal Invariant)")
ok(len(u) == 1 and (u[0], FSDD.reason, rdflib.Literal("broken-ref")) in g, "unresolved: reason broken-ref in the bytes")
ok((D["ShipInfo/SI3"], RDF.type, FAN.ShipInfo) in g, "unresolved: ShipInfo/SI3 survives")

# TRAVERSAL INVARIANT (Pin 4 made checkable in the parsed graph): no record typed as its own concernsType
q = g.query(
    "ASK { ?n a ?rec ; <https://fnsr.dev/fsdd#concernsType> ?t ; a ?t . "
    "FILTER(?rec IN (<https://fnsr.dev/fsdd#ImplicitEntityRecord>, <https://fnsr.dev/fsdd#UnresolvedRole>)) }")
ok(not bool(q), "Traversal Invariant: no ICE/UnresolvedRole is typed as its concernsType (ASK -> false)")

for m in fails:
    print("FAIL:", m)
print(f"\n{len(g)} triples parsed; {len(fails)} assertion(s) failed")
sys.exit(1 if fails else 0)
