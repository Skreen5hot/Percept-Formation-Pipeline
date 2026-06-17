// RD-1..RD-9 rendering-derivations catalogue (section 3.6) -- pure, total functions

// RD-1: strip namespace prefix (before ':') and trailing 'Type'
export function semanticTypeLocalName(vizDataTypeIRI) {
  const raw = (vizDataTypeIRI && typeof vizDataTypeIRI === 'object' && '@id' in vizDataTypeIRI)
    ? vizDataTypeIRI['@id']
    : vizDataTypeIRI;
  if (typeof raw !== 'string') return null;
  const local = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
  return local.endsWith('Type') ? local.slice(0, -4) : local;
}

// RD-5: hash normalization
const HEX64 = /^[0-9a-f]{64}$/;
const SHA256_HEX64 = /^sha256:[0-9a-f]{64}$/;

export function normalizeHash(h) {
  if (typeof h !== 'string') return null;
  if (HEX64.test(h)) return 'sha256:' + h;
  if (SHA256_HEX64.test(h)) return h;
  return null;
}

export function hashValid(h) {
  return normalizeHash(h) !== null;
}

// RD-6: structuralType -> csvw:datatype
const DATATYPE_MAP = {
  string: 'string',
  integer: 'integer',
  number: 'decimal',
  boolean: 'boolean',
  'boolean-encoded-string': 'boolean',
};

export function datatypeFor(structuralType) {
  return DATATYPE_MAP[structuralType] ?? null;
}

// RD-4: convergence -- channel + vote only; bind:evidence DROPPED
export function convergence(bindConvergence) {
  if (!Array.isArray(bindConvergence)) return [];
  return bindConvergence.map(v => ({ channel: v['bind:channel'], vote: v['bind:vote'] }));
}

// RD-2: consensus verbatim
export function consensusVerbatim(x) { return x; }

// RD-3: typeDistribution verbatim
export function typeDistributionVerbatim(x) { return x; }

// RD-7: bare role verbatim
export function roleVerbatim(x) { return x; }

// RD-8: axiom verbatim
export function axiomVerbatim(x) { return x; }

// RD-9: grounding -> CSVW-native
export function groundingToCsvw(conceptIRI) {
  return { csvwValueUrl: conceptIRI };
}
