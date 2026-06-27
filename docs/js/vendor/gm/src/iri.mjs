export const BASE = 'https://fnsr.dev/data/';
export const PREFIX = 'fdata:';

export function localName(concept) {
  const i = concept.indexOf(':');
  return i === -1 ? concept : concept.slice(i + 1);
}

export function entityIRI(concept, key) {
  return PREFIX + localName(concept) + '/' + encodeURIComponent(String(key));
}

export function nodeIRI(kind, frameKey, role) {
  return PREFIX + kind + '/' + frameKey + (role ? '-' + role : '');
}

export function frameIRI(recordConcept, frameKey) {
  return PREFIX + localName(recordConcept) + '/' + frameKey;
}
