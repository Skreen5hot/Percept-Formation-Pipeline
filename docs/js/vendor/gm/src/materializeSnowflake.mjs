import { entityIRI, nodeIRI } from './iri.mjs';

export function materializeHops({ subjectConcept, subjectKey, hops }) {
  const triples = [];
  const subjectIRI = entityIRI(subjectConcept, subjectKey);

  triples.push({ s: subjectIRI, p: 'rdf:type', o: subjectConcept });

  for (const hop of hops) {
    if (hop.outcome === 'resolved') {
      const e = entityIRI(hop.concept, hop.resolvedKey);
      triples.push({ s: subjectIRI, p: 'fan:' + hop.role, o: e });
      triples.push({ s: e, p: 'rdf:type', o: hop.concept });
    } else if (hop.outcome === 'absent') {
      // no edge, no ICE, no marker -- the optional relation is simply unfilled
    } else if (hop.outcome === 'dangling') {
      const u = nodeIRI('unresolved', subjectKey, hop.role);
      triples.push({ s: subjectIRI, p: 'fan:' + hop.role, o: u });
      triples.push({ s: u, p: 'rdf:type', o: 'fsdd:UnresolvedRole' });
      triples.push({ s: u, p: 'fsdd:role', o: hop.role, lit: true });
      triples.push({ s: u, p: 'fsdd:concernsType', o: hop.concept });
      triples.push({ s: u, p: 'fsdd:reason', o: hop.reason, lit: true });
    }
  }

  return { triples };
}
