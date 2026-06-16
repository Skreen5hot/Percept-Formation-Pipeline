import { createScope } from './vendor/fandaws/scope.mjs';

let scope = null;

export async function init() {
  if (scope) return;
  const res = await fetch('./data/pcf_scope.json');
  const data = await res.json();
  scope = createScope(data.concepts);
}

function _bind(value) {
  const records = scope.resolveTerm(String(value ?? ''));
  const record = records && records.length > 0 ? records[0] : null;
  return {
    value: value ?? '',
    conceptId: record?.id ?? null,
    code: record?.codedValues?.[0] ?? null,
    label: record?.primaryLabel ?? null,
    match: record ? 'resolved' : 'no match',
  };
}

// PER-ROW resolution (review fix): a column of 12 distinct process names binds to 12 DISTINCT concepts;
// resolving one value and showing it as a field-level binding overstated it. We resolve the cell value of
// the primary label field for EVERY row, so the binding is honest and verifiable (value + concept label
// both shown). `which` picks the bindable field; default 'process_name'.
export function bindRows(displayRecords, which = 'process_name') {
  if (!scope) throw new Error('call init() first');
  const field = (displayRecords[0] && which in displayRecords[0]) ? which : Object.keys(displayRecords[0] || {})[0];
  const rows = displayRecords.map((r, i) => ({ row: i + 1, field, ..._bind(r[field]) }));
  return { field, rows, bound: rows.filter(b => b.match === 'resolved').length, total: rows.length };
}
