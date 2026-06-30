export const PREFIXES = {
  fan: 'https://fandaws.dev/concept/',   // the Fandaws concept ontology (matches actofordering_law.ttl); was fnsr.dev/fan# (a prefix bug -- emitted class IRIs did not link to the TBox)
  fsdd: 'https://fnsr.dev/fsdd#',
  fdata: 'https://fnsr.dev/data/',
  iao: 'https://fnsr.dev/iao#',
  obo: 'http://purl.obolibrary.org/obo/',          // S4: BFO ids (role/realized-in: obo:BFO_xxxx) for the role layer (S6)
  cco: 'https://www.commoncoreontologies.org/',     // S4: CCO co-types (Organization/Person/Agent: cco:ont0000xxxx)
  xsd: 'http://www.w3.org/2001/XMLSchema#',          // S4: datatype IRIs for typed literals (xsd:date on fan:dateValue, S7)
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
};

function termToTurtle(term) {
  const colon = term.indexOf(':');
  if (colon === -1) return term;
  const prefix = term.slice(0, colon);
  const local = term.slice(colon + 1);
  if (!(prefix in PREFIXES)) return term;
  const needsExpansion = /[^A-Za-z0-9_.]/.test(local) || local.endsWith('.');
  if (needsExpansion) {
    return '<' + PREFIXES[prefix] + local + '>';
  }
  return term;
}

export function toTurtle(triples) {
  const lines = [];
  for (const [p, iri] of Object.entries(PREFIXES)) {
    lines.push(`@prefix ${p}: <${iri}> .`);
  }
  for (const { s, p, o, lit } of triples) {
    const subject = termToTurtle(s);
    const predicate = p === 'rdf:type' ? 'a' : termToTurtle(p);
    // S4 THIRD BRANCH: a typed literal arrives as { value, datatype } (an object, not a string) -> emit
    // "value"^^prefix:local. Detected BEFORE the lit/IRI branches so a non-string object never reaches
    // termToTurtle (which would throw on .indexOf). datatype is a prefixed term (e.g. xsd:date).
    let object;
    if (o !== null && typeof o === 'object' && 'value' in o) {
      object = JSON.stringify(String(o.value)) + '^^' + termToTurtle(o.datatype);
    } else if (lit) {
      object = JSON.stringify(o);
    } else {
      object = termToTurtle(o);
    }
    lines.push(`${subject} ${predicate} ${object} .`);
  }
  return lines.join('\n');
}
