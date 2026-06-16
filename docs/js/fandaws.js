import { createScope } from './vendor/fandaws/scope.mjs';

let scope = null;

export async function init() {
  if (scope) return;
  const res = await fetch('./data/pcf_scope.json');
  const data = await res.json();
  scope = createScope(data.concepts);
}

export function bindFields(displayRecords, fields) {
  if (!scope) throw new Error('call init() first');
  const firstRow = displayRecords[0] ?? {};
  return fields.map(field => {
    const sampleValue = firstRow[field] ?? '';
    const records = scope.resolveTerm(String(sampleValue));
    const record = records && records.length > 0 ? records[0] : null;
    return {
      field,
      sampleValue,
      conceptId: record?.id ?? null,
      code: record?.codedValues?.[0] ?? null,
      label: record?.primaryLabel ?? '-- no match',
      match: record ? 'resolved' : 'no match',
    };
  });
}
