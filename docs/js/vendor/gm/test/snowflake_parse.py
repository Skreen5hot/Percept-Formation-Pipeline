"""Layer-4 verification of the SNOWFLAKE front: parse the SERIALIZED Turtle through a real RDF parser (rdflib)
and assert the FOUR per-subject hop outcomes IN THE PARSED BYTES -- not the in-memory triple array. This is the
GM-arc lesson applied to the wiring: the assertion channel must be the bytes the user actually receives.

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

# COREFERENCE: SI1 ship-to is the SAME node as the orderer (Customer/C1), across a 1-hop and 2-hop path
si1 = list(g.objects(D["ShipInfo/SI1"], FAN.hasCustomer))
ordc = list(g.objects(D["ActOfOrdering/ord-10"], FAN.hasCustomer))
ok(si1 == [D["Customer/C1"]] and ordc == [D["Customer/C1"]],
   "coreference: SI1 ship-to == the orderer Customer/C1 (one node, two paths)")
ok(len(list(g.subjects(RDF.type, FAN.Customer))) >= 1 and (D["Customer/C1"], RDF.type, FAN.Customer) in g,
   "coreference: Customer/C1 typed fan:Customer in the parsed bytes")

# DIVERGENT: SI9 -> Customer/C2, a distinct node
ok(list(g.objects(D["ShipInfo/SI9"], FAN.hasCustomer)) == [D["Customer/C2"]]
   and (D["Customer/C2"], RDF.type, FAN.Customer) in g,
   "divergent: SI9 ship-to == a DISTINCT node Customer/C2")

# NON-EMISSION: SI2 present + typed, NO hasCustomer, ONLY its type triple (no ICE, no marker)
ok((D["ShipInfo/SI2"], RDF.type, FAN.ShipInfo) in g, "non-emission: ShipInfo/SI2 present + typed")
ok(len(list(g.objects(D["ShipInfo/SI2"], FAN.hasCustomer))) == 0, "non-emission: SI2 has NO hasCustomer edge")
ok(len(list(g.predicate_objects(D["ShipInfo/SI2"]))) == 1, "non-emission: SI2 carries ONLY its type triple (no ICE/marker)")

# UNRESOLVED: SI3 -> UnresolvedRole, reason broken-ref, NEVER typed Customer; ShipInfo survives
u = list(g.objects(D["ShipInfo/SI3"], FAN.hasCustomer))
ok(len(u) == 1 and (u[0], RDF.type, FSDD.UnresolvedRole) in g, "unresolved: SI3 -> an UnresolvedRole node")
ok(len(u) == 1 and (u[0], RDF.type, FAN.Customer) not in g, "unresolved: NOT typed fan:Customer (Traversal Invariant)")
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
