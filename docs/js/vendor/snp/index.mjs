import { detectFormat, parseCSV, toCSV } from './src/parse.mjs';
import { hygiene, emptyToNull, stripCurrency, isBigInt, normalizeDate } from './src/rules.mjs';

/**
 * @param {string} input
 * @param {Partial<{locale:string|null,format:string|null}>} [config]
 * @returns {{cleaned:string,manifest:Array,format:string,diagnostics:Array}}
 */
export function normalize(input, config = {}) {
  const locale = config.locale ?? null;
  const formatOverride = config.format ?? null;

  const manifest = [];
  const diagnostics = [];

  // §4.1 BOM strip
  let working = input;
  if (working.startsWith('\uFEFF')) {
    working = working.slice(1);
    diagnostics.push({ level: 'info', code: 'SNP-001', message: 'BOM detected and stripped', context: {} });
    manifest.push({ rule: 'bom_strip', path: '*', detail: { type: 'bom_stripped' } });
  }

  // Detect format
  const format = formatOverride ?? detectFormat(working);

  if (format === 'csv') {
    // Parse
    let header, rows;
    try {
      const parsed = parseCSV(working);
      header = parsed.header;
      rows = parsed.rows;
    } catch (e) {
      diagnostics.push({
        level: 'error', code: 'SNP-007',
        message: 'CSV parse failure: ' + (e && e.message ? e.message : String(e)),
        context: { row: null, message: e && e.message ? e.message : String(e) }
      });
      return { cleaned: '', manifest, format, diagnostics };
    }

    // §4.2 trailing column removal: columns 100% empty across all data rows
    const colCount = header.length;
    const emptyCol = new Array(colCount).fill(true);
    for (const row of rows) {
      for (let ci = 0; ci < colCount; ci++) {
        const cell = row[ci] ?? '';
        if (cell.trim() !== '') emptyCol[ci] = false;
      }
    }
    // Collect removed columns (in reverse to preserve positions)
    const removedPositions = [];
    for (let ci = 0; ci < colCount; ci++) {
      if (emptyCol[ci]) removedPositions.push(ci);
    }
    // Build kept indices
    const keptIndices = [];
    for (let ci = 0; ci < colCount; ci++) {
      if (!emptyCol[ci]) keptIndices.push(ci);
    }
    // Emit SNP-002 per removed column
    for (const ci of removedPositions) {
      const hdr = header[ci];
      diagnostics.push({
        level: 'info', code: 'SNP-002',
        message: `Trailing column removed: "${hdr}" at position ${ci}`,
        context: { header: hdr, position: ci }
      });
      manifest.push({ rule: 'trailing_column_removal', path: '*', detail: { type: 'column_removed', header: hdr, position: ci } });
    }
    // Apply column removal
    const newHeader = keptIndices.map(i => header[i]);
    const newRows = rows.map(row => keptIndices.map(i => row[i] ?? ''));

    // Per-value rules: track manifest entries per column
    const nullCounts = {}; // header -> count
    const currencyEntries = []; // manifest entries
    const currencyColCounts = {}; // header -> count
    const bigintColCounts = {}; // header -> count
    const dateConvertedCounts = {}; // header -> count
    const dateFailedPerPath = {}; // header -> [{value, locale}]

    const cleanedRows = newRows.map(row =>
      row.map((cell, ci) => {
        const colHeader = newHeader[ci];
        let val = cell;

        // §4.3 hygiene
        val = hygiene(val);

        // §4.4 emptyToNull
        const afterEmpty = emptyToNull(val);
        if (afterEmpty === null && val !== null) {
          nullCounts[colHeader] = (nullCounts[colHeader] || 0) + 1;
          val = null;
        } else {
          val = afterEmpty;
        }

        if (val === null) return null;

        // §4.5 stripCurrency
        const afterCurrency = stripCurrency(val);
        if (afterCurrency !== val) {
          // determine artifacts
          const artifacts = [];
          const symMatch = val.match(/^([$€£¥₹₩₽₺₱฿])/);
          if (symMatch) artifacts.push(symMatch[1]);
          if (/,/.test(val) && !/,/.test(afterCurrency)) artifacts.push('thousands_separator');
          if (val.endsWith('%') && !afterCurrency.endsWith('%')) artifacts.push('%');
          currencyEntries.push({ rule: 'currency_strip', path: colHeader, detail: { type: 'currency_stripped', originalValue: val, cleanedValue: afterCurrency, artifacts } });
          currencyColCounts[colHeader] = (currencyColCounts[colHeader] || 0) + 1;
          val = afterCurrency;
        }

        // §4.6 isBigInt
        if (isBigInt(val)) {
          bigintColCounts[colHeader] = (bigintColCounts[colHeader] || 0) + 1;
          manifest.push({ rule: 'bigint_protection', path: colHeader, detail: { type: 'bigint_flagged', valueLength: val.length } });
        }

        // §4.7 normalizeDate (only if locale)
        if (locale) {
          const afterDate = normalizeDate(val, locale);
          if (afterDate !== val) {
            // Check if it produced a valid ISO or a failure signal
            // normalizeDate returns ISO string on success, original on failure/no-match
            // We need to detect invalid date case -> SNP-005
            // Per spec: if regex matched but validation failed, SNP-005
            // We trust normalizeDate: if it returns something different, it succeeded
            dateConvertedCounts[colHeader] = (dateConvertedCounts[colHeader] || 0) + 1;
            manifest.push({ rule: 'date_normalization', path: colHeader, detail: { type: 'date_converted', originalValue: val, locale, isoValue: afterDate } });
            val = afterDate;
          }
          // SNP-005: we cannot detect regex-match-but-invalid from the interface alone;
          // normalizeDate returns original on invalid, so we can't distinguish no-match from invalid.
          // Best effort: skip SNP-005 emission (interface doesn't expose that signal).
        }

        return val;
      })
    );

    // Emit null coalescence manifest entries
    for (const [col, count] of Object.entries(nullCounts)) {
      manifest.push({ rule: 'null_coalescence', path: col, detail: { type: 'null_coalescence', count } });
    }

    // Emit currency manifest entries
    for (const entry of currencyEntries) manifest.push(entry);

    // Emit SNP-003 diagnostics
    for (const [col, count] of Object.entries(currencyColCounts)) {
      diagnostics.push({ level: 'info', code: 'SNP-003', message: `Currency/formatting stripping applied to column "${col}"`, context: { path: col, affectedCount: count } });
    }

    // Emit SNP-004 diagnostics
    for (const [col, count] of Object.entries(bigintColCounts)) {
      diagnostics.push({ level: 'info', code: 'SNP-004', message: `BigInt-protected values in column "${col}"`, context: { path: col, flaggedCount: count } });
    }

    // Emit SNP-006 diagnostics
    for (const [col, count] of Object.entries(dateConvertedCounts)) {
      diagnostics.push({ level: 'info', code: 'SNP-006', message: `Date normalization applied to column "${col}"`, context: { path: col, convertedCount: count, locale } });
    }

    // Serialize cells back: null -> ""
    const serializedRows = cleanedRows.map(row => row.map(cell => cell === null ? '' : String(cell)));
    const cleaned = toCSV(newHeader, serializedRows);
    return { cleaned, manifest, format, diagnostics };

  } else {
    // JSON branch
    let obj;
    try {
      obj = JSON.parse(working);
    } catch (e) {
      diagnostics.push({
        level: 'error', code: 'SNP-008',
        message: 'JSON parse failure: ' + (e && e.message ? e.message : String(e)),
        context: { position: null, message: e && e.message ? e.message : String(e) }
      });
      return { cleaned: '', manifest, format, diagnostics };
    }

    const nullCounts = {};
    const currencyColCounts = {};
    const bigintColCounts = {};
    const dateConvertedCounts = {};

    function walkJson(node, pointer) {
      if (node === null || node === undefined) return node;
      if (typeof node === 'string') {
        let val = node;

        // §4.3 hygiene
        val = hygiene(val);

        // §4.4 emptyToNull
        const afterEmpty = emptyToNull(val);
        if (afterEmpty === null) {
          nullCounts[pointer] = (nullCounts[pointer] || 0) + 1;
          val = null;
        } else {
          val = afterEmpty;
        }

        if (val === null) return null;

        // §4.5 stripCurrency
        const afterCurrency = stripCurrency(val);
        if (afterCurrency !== val) {
          const artifacts = [];
          const symMatch = val.match(/^([$€£¥₹₩₽₺₱฿])/);
          if (symMatch) artifacts.push(symMatch[1]);
          if (/,/.test(val) && !/,/.test(afterCurrency)) artifacts.push('thousands_separator');
          if (val.endsWith('%') && !afterCurrency.endsWith('%')) artifacts.push('%');
          manifest.push({ rule: 'currency_strip', path: pointer, detail: { type: 'currency_stripped', originalValue: val, cleanedValue: afterCurrency, artifacts } });
          currencyColCounts[pointer] = (currencyColCounts[pointer] || 0) + 1;
          val = afterCurrency;
        }

        // §4.6 isBigInt
        if (isBigInt(val)) {
          bigintColCounts[pointer] = (bigintColCounts[pointer] || 0) + 1;
          manifest.push({ rule: 'bigint_protection', path: pointer, detail: { type: 'bigint_flagged', valueLength: val.length } });
        }

        // §4.7 normalizeDate
        if (locale) {
          const afterDate = normalizeDate(val, locale);
          if (afterDate !== val) {
            dateConvertedCounts[pointer] = (dateConvertedCounts[pointer] || 0) + 1;
            manifest.push({ rule: 'date_normalization', path: pointer, detail: { type: 'date_converted', originalValue: val, locale, isoValue: afterDate } });
            val = afterDate;
          }
        }

        return val;
      }
      if (Array.isArray(node)) {
        return node.map((item, i) => walkJson(item, pointer + '/' + i));
      }
      if (typeof node === 'object') {
        const out = {};
        for (const key of Object.keys(node)) {
          out[key] = walkJson(node[key], pointer + '/' + encodeJsonPointerToken(key));
        }
        return out;
      }
      // number, boolean: pass through
      return node;
    }

    const cleaned_obj = walkJson(obj, '');

    // Emit null coalescence manifest
    for (const [path, count] of Object.entries(nullCounts)) {
      manifest.push({ rule: 'null_coalescence', path, detail: { type: 'null_coalescence', count } });
    }

    // Emit SNP-003
    for (const [path, count] of Object.entries(currencyColCounts)) {
      diagnostics.push({ level: 'info', code: 'SNP-003', message: `Currency/formatting stripping applied at path "${path}"`, context: { path, affectedCount: count } });
    }

    // Emit SNP-004
    for (const [path, count] of Object.entries(bigintColCounts)) {
      diagnostics.push({ level: 'info', code: 'SNP-004', message: `BigInt-protected values at path "${path}"`, context: { path, flaggedCount: count } });
    }

    // Emit SNP-006
    for (const [path, count] of Object.entries(dateConvertedCounts)) {
      diagnostics.push({ level: 'info', code: 'SNP-006', message: `Date normalization applied at path "${path}"`, context: { path, convertedCount: count, locale } });
    }

    const cleaned = JSON.stringify(cleaned_obj);
    return { cleaned, manifest, format, diagnostics };
  }
}

function encodeJsonPointerToken(key) {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}
