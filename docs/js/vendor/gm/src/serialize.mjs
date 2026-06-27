export const PREFIXES = {
  fan: 'https://fnsr.dev/fan#',
  fsdd: 'https://fnsr.dev/fsdd#',
  fdata: 'https://fnsr.dev/data/',
  iao: 'https://fnsr.dev/iao#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
};

function writeTerm(term, lit) {
  if (lit) return JSON.stringify(term);
  return term;
}

export function toTurtle(triples) {
  const lines = [];
  for (const [prefix, iri] of Object.entries(PREFIXES)) {
    lines.push(`@prefix ${prefix}: <${iri}> .`);
  }
  for (const { s, p, o, lit } of triples) {
    const pred = p === 'rdf:type' ? 'a' : p;
    lines.push(`${s} ${pred} ${writeTerm(o, lit)} .`);
  }
  return lines.join('\n');
}
