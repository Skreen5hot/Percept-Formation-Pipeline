import { buildIndex } from './index.mjs';

export function createScope(records) {
  const index = buildIndex(records);

  function resolveTerm(label) {
    const needle = label.toLowerCase().trim();
    return records.filter(r =>
      r.primaryLabel.toLowerCase().trim() === needle ||
      r.alternateLabels.some(a => a.toLowerCase().trim() === needle)
    );
  }

  function getConcept(id) {
    return index.get(id) ?? null;
  }

  function resolveValue(value) {
    for (const r of records) {
      if (r.codedValues.includes(value)) return r;
    }
    return null;
  }

  return { resolveTerm, getConcept, resolveValue };
}
