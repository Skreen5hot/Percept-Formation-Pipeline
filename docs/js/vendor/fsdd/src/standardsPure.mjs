const BLOCKED_PREFIX = /^(fsdd|sas|viz):/;

function isBlockedValue(v) {
  return typeof v === 'string' && BLOCKED_PREFIX.test(v);
}

function stripValue(v) {
  if (Array.isArray(v)) {
    return v.map(stripValue).filter(item => item !== undefined);
  }
  if (v !== null && typeof v === 'object') {
    return stripObject(v);
  }
  return v;
}

function stripObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (BLOCKED_PREFIX.test(k)) continue;
    if ((k === '@type' || k === '@id') && isBlockedValue(v)) continue;
    if (k === '@type' && Array.isArray(v)) {
      const filtered = v.filter(t => !isBlockedValue(t));
      if (filtered.length > 0) out[k] = filtered;
      continue;
    }
    out[k] = stripValue(v);
  }
  return out;
}

export function stripToStandards(dictionary) {
  return stripObject(JSON.parse(JSON.stringify(dictionary)));
}
