import { normalize as snpNormalize } from './vendor/snp/index.mjs';
import Papa from './vendor/bibss/vendor/papaparse.mjs';

export function normalize(raw) {
  const { cleaned, manifest, diagnostics } = snpNormalize(raw);
  let displayRecords = [];
  if (cleaned) {
    const parsed = Papa.parse(cleaned, { header: true, skipEmptyLines: true });
    displayRecords = parsed.data;
  }
  return { cleaned, displayRecords, manifest };
}
