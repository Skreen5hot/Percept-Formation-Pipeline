import { align } from './vendor/sas/src/align.mjs';

// SAS (Schema Alignment Service, PFP stage 3) demo adapter. SAS consumes a CISM and emits a
// viz:DatasetSchema. BIBSS' demo projection (bibss.js flatNodes) gives, per column, { field,
// primitiveType, typeDistribution } where typeDistribution sums to the NON-NULL observation count and
// carries no 'null' key or per-field occurrences. SAS' input contract wants each field node to carry
// { name, kind, primitiveType, typeDistribution, occurrences, nullCount }. We synthesise the missing
// pieces from the row count: occurrences = rowCount, nullCount = rowCount - nonNullSum, and fold the
// implied nulls into typeDistribution['null'] so sum(typeDistribution incl null) === occurrences (SAS'
// section 6.1.3 consistency invariant). The result is an object-root CISM SAS aligns in STANDALONE mode
// (no FandawsScope -- Fandaws is a consulted resource, never a hard dependency).
export function alignSchema(bibssResult, rowCount) {
  const rows = rowCount || 0;
  const properties = {};
  for (const n of bibssResult.flatNodes || []) {
    const td = { ...(n.typeDistribution || {}) };
    // BIBSS MAY already carry a 'null' key, so derive nulls from the non-null sum vs the row count and
    // REPLACE (never add to) the null bucket -- otherwise the implied + existing nulls double-count and
    // sum(td incl null) exceeds occurrences (a false SAS-013). rowCount is authoritative for tabular data.
    const nonNull = Object.entries(td).reduce((s, [k, v]) => (k === 'null' ? s : s + v), 0);
    const occ = Math.max(rows, nonNull);
    const nulls = Math.max(0, occ - nonNull);
    delete td['null'];
    if (nulls > 0) td['null'] = nulls;            // sum(td incl null) === occ
    properties[n.field] = {
      name: n.field,
      kind: n.primitiveType === 'union' ? 'union' : 'scalar',
      primitiveType: n.primitiveType,
      typeDistribution: td,
      occurrences: occ,
      nullCount: nulls,
    };
  }
  // ARRAY root (tabular): row count lives on itemType.occurrences (SAS ADR-009), so viz:totalRows is the
  // real row count, not 1. align() reads array-root fields from root.itemType.properties.
  const cism = { version: '1.3', root: { kind: 'array', occurrences: 1,
    itemType: { kind: 'object', occurrences: rows, properties } } };
  return align(cism, 'sha256:demo', {}, {});   // standalone: no SNP manifest, no Fandaws scope (yet)
}
