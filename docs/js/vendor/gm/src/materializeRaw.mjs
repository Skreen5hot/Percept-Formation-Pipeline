import { entityIRI, localName } from './iri.mjs';
import { adaptRaw } from './rawAdapter.mjs';

export function materializeRawFront(rawFSDD, rows, recordConcept) {
  const triples = [];
  const a = adaptRaw(rawFSDD, rows, recordConcept);

  if (a.datasetStatus === 'fails') {
    const X = '_:excluded-' + localName(recordConcept);
    triples.push({ s: X, p: 'rdf:type', o: 'fsdd:ExcludedFrame' });
    const violated = a.roles.filter(r => r.status === 'violated').map(r => r.role);
    triples.push({ s: X, p: 'fsdd:reason', o: 'violated-constitutive:' + violated.join(','), lit: true });
    return { triples };
  }

  const entityNodeCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const F = '_:' + localName(recordConcept) + '-' + i;
    triples.push({ s: F, p: 'rdf:type', o: recordConcept });

    for (const r of a.roles) {
      if (r.status !== 'fulfilled') continue;
      if (r.fillerKind === 'reference') {
        const e = entityIRI(r.concept, row[r.column]);
        triples.push({ s: F, p: 'fan:' + r.role, o: e });
        const cacheKey = e;
        if (!entityNodeCache.has(cacheKey)) {
          entityNodeCache.set(cacheKey, true);
          triples.push({ s: e, p: 'rdf:type', o: r.concept });
        }
      } else if (r.fillerKind === 'literal') {
        triples.push({ s: F, p: 'fan:' + r.role, o: String(row[r.column]), lit: true });
      }
    }

    for (const ice of a.ices) {
      const u = '_:ice-' + i + '-' + ice.role;
      triples.push({ s: F, p: 'fan:' + ice.role, o: u });
      triples.push({ s: u, p: 'rdf:type', o: 'fsdd:ImplicitEntityRecord' });
      triples.push({ s: u, p: 'fsdd:concernsType', o: ice.concernsType });
      triples.push({ s: u, p: 'fsdd:role', o: ice.role, lit: true });
    }
  }

  return { triples };
}
