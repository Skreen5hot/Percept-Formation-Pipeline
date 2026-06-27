import { materialize } from './materialize.mjs';

export function materializePortion(cases, mapping, selector) {
  const names = typeof selector === 'function'
    ? Object.keys(cases).filter(selector)
    : selector;

  const triples = [];
  for (const name of names) {
    const c = cases[name];
    if (c === undefined) continue;
    const out = materialize(c.result, mapping, c.row);
    for (const t of out.triples) triples.push(t);
  }
  return { triples };
}
