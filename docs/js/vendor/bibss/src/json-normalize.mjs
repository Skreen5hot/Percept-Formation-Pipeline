import { DIAG } from './types.mjs';
import { makeDiagnostic } from './ids.mjs';

const LARGE_INT_RE = /[0-9]{16,}/;

// §6.3: trim leading whitespace; first non-ws char { or [ → json; else csv.
// config.format overrides heuristic.
export function detectFormat(input, config) {
  if (config != null && config.format != null) return config.format;
  const s = typeof input === 'string' ? input : '';
  const first = s.trimStart()[0];
  return (first === '{' || first === '[') ? 'json' : 'csv';
}

// §7.2: normalize JSON to Array<Record<string, unknown>>.
// Accepts raw JSON string (does BIBSS-009 pre-scan + JSON.parse) or already-parsed value.
// Returns { records, diagnostics }.
// BIBSS-009: warn on 16+ digit sequences before parse (precision risk).
// BIBSS-004: error + records:null on SyntaxError.
export function normalizeJSON(input) {
  const diagnostics = [];
  let parsed;

  if (typeof input === 'string') {
    if (LARGE_INT_RE.test(input)) {
      diagnostics.push(makeDiagnostic(
        'warning',
        DIAG.BIBSS_009,
        'Input contains a numeric sequence of 16 or more digits; JSON.parse may silently lose integer precision'
      ));
    }
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      diagnostics.push(makeDiagnostic(
        'error',
        DIAG.BIBSS_004,
        'JSON parse failure: ' + (e && e.message ? e.message : String(e))
      ));
      return { records: null, diagnostics };
    }
  } else {
    parsed = input;
  }

  let records;
  if (Array.isArray(parsed)) {
    // Array of plain objects (non-null, non-array) → used directly (§7.2).
    const allPlainObjects = parsed.length > 0 &&
      parsed.every(v => v !== null && typeof v === 'object' && !Array.isArray(v));
    if (allPlainObjects) {
      records = parsed;
    } else {
      // Array of primitives or heterogeneous → wrap each in { _value } (§7.2).
      records = parsed.map(v => ({ _value: v }));
    }
  } else if (parsed !== null && typeof parsed === 'object') {
    // Single object → [object] (§7.2).
    records = [parsed];
  } else {
    // Primitive root → wrap.
    records = [{ _value: parsed }];
  }

  return { records, diagnostics };
}
