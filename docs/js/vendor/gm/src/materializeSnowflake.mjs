import { entityIRI, nodeIRI } from './iri.mjs';

export function materializeHops({ subjectConcept, subjectKey, hops }) {
  const triples = [];
  const subjectIRI = entityIRI(subjectConcept, subjectKey);

  triples.push({ s: subjectIRI, p: 'rdf:type', o: subjectConcept });

  for (const hop of hops) {
    if (hop.outcome === 'resolved') {
      const e = entityIRI(hop.concept, hop.resolvedKey);
      triples.push({ s: subjectIRI, p: 'fan:' + hop.role, o: e });   // hasShipToParty: ICE DESIGNATES the consignee Agent (no process domain; HermiT-clean)
      triples.push({ s: e, p: 'rdf:type', o: hop.concept });          // consignee a fan:Party (bearer); coreferent with the orderer when keys match (same entityIRI mint)
      if (hop.cotype) triples.push({ s: e, p: 'rdf:type', o: hop.cotype });   // S3: co-type the consignee (cco:Organization) even when it is NOT also the orderer (e.g. a divergent ship-to)
    } else if (hop.outcome === 'absent') {
      // no edge, no ICE, no marker -- the optional relation is simply unfilled
    } else if (hop.outcome === 'dangling') {
      const u = nodeIRI('unresolved', subjectKey, hop.role);
      triples.push({ s: subjectIRI, p: 'fsdd:hasUnresolvedRole', o: u });   // #3: re-seat OFF the fan:hasShipToParty slot (the broken designation never rides the fan: property)
      triples.push({ s: u, p: 'rdf:type', o: 'fsdd:UnresolvedRole' });
      triples.push({ s: u, p: 'fsdd:role', o: 'fan:' + hop.role });          // #4.G: the property IRI, not the legacy literal
      triples.push({ s: u, p: 'fsdd:concernsType', o: hop.concept });
      triples.push({ s: u, p: 'fsdd:reason', o: hop.reason, lit: true });
      triples.push({ s: u, p: 'fsdd:aboutFrame', o: subjectIRI });           // record -> the ShipInfo whose designation failed
    }
  }

  return { triples };
}
