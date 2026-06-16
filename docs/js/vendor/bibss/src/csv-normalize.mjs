import Papa from "../vendor/papaparse.mjs";
import { DIAG, DEFAULT_INFER_CONFIG } from "./types.mjs";
import { makeDiagnostic } from "./ids.mjs";

const MAX_ROW_DIAG = 10;

export function parseAndNormalizeCSV(input, config) {
  const cfg = { ...DEFAULT_INFER_CONFIG, ...(config ?? {}) };
  const diagnostics = [];

  // §6.1: Strip BOM (U+FEFF)
  if (typeof input === "string" && input.charCodeAt(0) === 0xfeff) {
    input = input.slice(1);
  }

  // BIBSS-001: warn if input exceeds maxSizeWarning (UTF-8 byte count)
  const byteLen =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(input).length
      : Buffer.byteLength(input, "utf8");
  if (byteLen > cfg.maxSizeWarning) {
    diagnostics.push(
      makeDiagnostic(
        "warning",
        DIAG.BIBSS_001,
        `Input size ${byteLen} bytes exceeds maxSizeWarning ${cfg.maxSizeWarning}`,
        { byteCount: byteLen, maxSizeWarning: cfg.maxSizeWarning }
      )
    );
  }

  // §7.1.1: Parse with Papa Parse (vendor/papaparse.mjs — no CDN)
  let result;
  try {
    result = Papa.parse(input, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
  } catch (err) {
    diagnostics.push(
      makeDiagnostic(
        "error",
        DIAG.BIBSS_005,
        `Papa Parse threw: ${err?.message ?? String(err)}`
      )
    );
    return { rows: null, diagnostics };
  }

  // Partition errors:
  // - FieldMismatch → BIBSS-003 (row-length mismatch, non-fatal)
  // - Delimiter/UndetectableDelimiter → non-fatal; Papa Parse fell back to
  //   default comma and still produced rows (occurs when data rows have no
  //   delimiter chars so auto-detection scores all candidates below 1.99)
  // - Everything else (Quotes/MissingQuotes, etc.) → fatal BIBSS-005
  const fieldErrors = (result.errors ?? []).filter(
    (e) => e.type === "FieldMismatch"
  );
  const fatalErrors = (result.errors ?? []).filter(
    (e) => e.type !== "FieldMismatch" && e.type !== "Delimiter"
  );

  if (fatalErrors.length > 0) {
    diagnostics.push(
      makeDiagnostic(
        "error",
        DIAG.BIBSS_005,
        fatalErrors.map((e) => e.message).join("; "),
        { errors: fatalErrors }
      )
    );
    return { rows: null, diagnostics };
  }

  // BIBSS-003: emit per-row diagnostics for row-length mismatches, capped at 10
  let diagCount = 0;
  for (const fe of fieldErrors) {
    if (diagCount >= MAX_ROW_DIAG) break;
    diagnostics.push(
      makeDiagnostic("warning", DIAG.BIBSS_003, fe.message, {
        row: fe.row,
        code: fe.code,
      })
    );
    diagCount++;
  }

  const headers = result.meta?.fields ?? [];
  const rawRows = result.data ?? [];

  // §7.1.2: Post-parse transforms
  const rows = rawRows.map((raw) => {
    const row = {};

    // Reconstruct row using only header keys (truncates extra fields)
    for (const key of headers) {
      if (Object.hasOwn(raw, key)) {
        row[key] = raw[key];
      }
    }

    // (1) Trim all string values
    for (const key of headers) {
      if (Object.hasOwn(row, key) && typeof row[key] === "string") {
        row[key] = row[key].trim();
      }
    }

    // (2) Empty string → null when emptyStringAsNull
    if (cfg.emptyStringAsNull) {
      for (const key of headers) {
        if (Object.hasOwn(row, key) && row[key] === "") {
          row[key] = null;
        }
      }
    }

    // (3) Missing keys inserted as null (key-set verification)
    for (const key of headers) {
      if (!Object.hasOwn(row, key)) {
        row[key] = null;
      }
    }

    return row;
  });

  return { rows, diagnostics };
}
