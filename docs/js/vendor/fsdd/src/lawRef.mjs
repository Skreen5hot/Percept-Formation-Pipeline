import { normalizeHash } from './render.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function lawReference(lawHash, lawRegistry) {
  const nh = normalizeHash(lawHash);
  const ref = { 'fsdd:lawHash': nh };
  if (lawRegistry && lawRegistry[lawHash]) {
    const entry = lawRegistry[lawHash];
    ref['fsdd:lawIRI'] = entry.lawIRI;
    ref['fsdd:lawTitle'] = entry.lawTitle;
    ref['fsdd:lawVersion'] = entry.lawVersion;
    ref['fsdd:lawPublished'] = entry.lawPublished;
    return { ref, diagnostic: null };
  }
  return { ref, diagnostic: makeDiagnostic('FSDD-010', { lawHash: nh }) };
}
