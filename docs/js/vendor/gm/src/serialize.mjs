export const PREFIXES = {
  fan: 'https://fnsr.dev/fan#',
  fsdd: 'https://fnsr.dev/fsdd#',
  fdata: 'https://fnsr.dev/data/',
  iao: 'https://fnsr.dev/iao#',
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
    const object = lit ? JSON.stringify(o) : termToTurtle(o);
    lines.push(`${subject} ${predicate} ${object} .`);
  }
  return lines.join('\n');
}
