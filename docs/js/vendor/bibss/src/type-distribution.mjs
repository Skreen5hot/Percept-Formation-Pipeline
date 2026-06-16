import { isInteger } from './primitive-resolve.mjs';

const LATTICE_ORDER = ['null', 'boolean', 'integer', 'number', 'string'];

export function classifyForDist(v) {
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'boolean') return 'boolean';
  if (t === 'number') return isInteger(v) ? 'integer' : 'number';
  return 'string';
}

export function newTypeDistribution() {
  return { null: 0, boolean: 0, integer: 0, number: 0, string: 0 };
}

export function accumulateTypeDistribution(dist, value) {
  const key = classifyForDist(value);
  dist[key] = (dist[key] || 0) + 1;
}

export function serializeTypeDistribution(dist) {
  const out = {};
  for (const key of LATTICE_ORDER) {
    const n = dist[key];
    if (n != null && n > 0) out[key] = n;
  }
  return out;
}
