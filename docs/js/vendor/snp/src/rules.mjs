// SNP §4.3–§4.7 per-value cleaning rules

// §4.3 Whitespace Hygiene
export function hygiene(s) {
  // Remove zero-width and mid-string BOM characters
  s = s.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  // Remove ASCII control chars except tab (\x09) and newline (\x0A)
  s = s.replace(/[\x00-\x08\x0B-\x1F]/g, '');
  // Trim leading/trailing whitespace (including tabs and newlines)
  s = s.trim();
  // Collapse runs of 2+ internal whitespace to single space
  s = s.replace(/[ \t\n]{2,}/g, ' ');
  return s;
}

// §4.4 Empty-to-Null Coalescence
export function emptyToNull(s) {
  return s === '' ? null : s;
}

// §4.5 Currency/Formatting Stripping
export function stripCurrency(s) {
  // Step 1: strip leading currency symbol and optional trailing whitespace
  s = s.replace(/^[$\u20AC\u00A3\u00A5\u20B9\u20A9\u20BD\u20BA\u20B1\u0E3F]\s*/, '');
  // Step 2: strip thousands separators
  s = s.replace(/,(?=\d{3}(?:[,.]|\b))/g, '');
  // Step 3: strip trailing percentage sign
  s = s.replace(/%$/, '');
  return s;
}

// §4.6 BigInt String Protection
export function isBigInt(s) {
  return /^-?\d{16,}$/.test(s);
}

// §4.7 Locale-Aware Date Normalization
const DATE_PATTERNS = {
  'en-US': { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, year: 3, month: 1, day: 2 },
  'en-GB': { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, year: 3, month: 2, day: 1 },
  'de-DE': { re: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, year: 3, month: 2, day: 1 },
  'ja-JP': { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, year: 1, month: 2, day: 3 },
};

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function maxDay(month, year) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return DAYS_IN_MONTH[month];
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function normalizeDate(s, locale) {
  if (!locale || !DATE_PATTERNS[locale]) return { status: 'skip', value: s };
  const { re, year, month, day } = DATE_PATTERNS[locale];
  const m = re.exec(s);
  if (!m) return { status: 'skip', value: s };
  const y = Number(m[year]);
  const mo = Number(m[month]);
  const d = Number(m[day]);
  if (mo < 1 || mo > 12) return { status: 'invalid', value: s };
  if (d < 1 || d > maxDay(mo, y)) return { status: 'invalid', value: s };
  return { status: 'converted', value: `${y}-${pad2(mo)}-${pad2(d)}` };
}
