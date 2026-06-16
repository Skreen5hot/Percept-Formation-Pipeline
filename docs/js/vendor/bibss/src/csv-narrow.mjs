// §7.1.3 — First-match-wins type-narrowing pass over post-parse CSV records.
const BOOL_RE = /^(true|false)$/i;
const INT_RE = /^-?(?:0|[1-9][0-9]*)$/;
const NUM_RE = /^-?[0-9]+\.[0-9]+$/;

function narrowValue(v) {
  if (v === null) return null;
  if (typeof v !== "string") return v;
  if (BOOL_RE.test(v)) return v.toLowerCase() === "true";
  if (INT_RE.test(v)) {
    const n = Number(v);
    if (n <= Number.MAX_SAFE_INTEGER) return n;
    return v;
  }
  if (NUM_RE.test(v)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}

export function narrowCSVTypes(records) {
  return records.map(record => {
    const out = {};
    for (const key of Object.keys(record)) {
      out[key] = narrowValue(record[key]);
    }
    return out;
  });
}
