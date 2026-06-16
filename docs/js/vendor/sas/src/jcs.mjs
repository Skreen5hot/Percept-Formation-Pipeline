export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const sorted = Object.keys(value).sort();
  return '{' + sorted.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

export function sortDedupStrings(arr) {
  const seen = new Set();
  const deduped = [];
  for (const s of arr) {
    const folded = s.toLowerCase();
    if (!seen.has(folded)) { seen.add(folded); deduped.push(s); }
  }
  return deduped.slice().sort();
}
