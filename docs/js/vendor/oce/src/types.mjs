export const VERDICT = { SUCCEEDS: 'succeeds', INCOMPLETE: 'incomplete', FAILS: 'fails' };
export const STATUS = { FULFILLED: 'fulfilled', VIOLATED: 'violated', EMPTY: 'empty' };
export const KIND = { SUBSUMPTION: 'subsumption', INHERENCE: 'inherence', RELATIONAL: 'relational' };
export const DISPOSITION = { succeeds: 'assert', incomplete: 'assert-partial', fails: 'refuse' };

export function localName(iri) {
  const s = String(iri);
  const i = Math.max(s.lastIndexOf(':'), s.lastIndexOf('/'), s.lastIndexOf('#'));
  return i >= 0 ? s.slice(i + 1) : s;
}

export function necessityResult({ relation, kind, requiredType, status, fulfilledBy, evidence }) {
  return {
    'oce:relation': relation,
    'oce:kind': kind,
    'oce:requiredType': requiredType ?? null,
    'oce:status': status,
    'oce:fulfilledBy': fulfilledBy ?? null,
    'oce:evidence': String(evidence || '')
  };
}
