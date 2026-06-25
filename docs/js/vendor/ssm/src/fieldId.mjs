// fieldId.mjs -- §5.2, §5.5: canonical field identifier + C-2 flat-binding firewall linter
// SAS §5.5 normalizeFieldName rule
export function slug(name) {
  const s = String(name == null ? '' : name)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s === '' ? 'field' : s;
}

// Part A
export function fieldId(name) {
  return 'viz:field/' + slug(name);
}

// Part B -- slug EVERY segment
export function qualifiedFieldId(source, table, name) {
  return 'viz:field/' + slug(source) + '/' + slug(table) + '/' + slug(name);
}

// Strip {source}/{table} segments; idempotent on an already-unqualified id
export function downProject(qualified) {
  const prefix = 'viz:field/';
  if (!qualified.startsWith(prefix)) return qualified;
  const rest = qualified.slice(prefix.length);
  const parts = rest.split('/');
  // unqualified: exactly one segment -- already fine
  if (parts.length <= 1) return qualified;
  // qualified: keep only the last segment
  return prefix + parts[parts.length - 1];
}

// C-2 firewall: true IFF exactly one segment after 'viz:field/'
export function isFlatBindingSafe(id) {
  const prefix = 'viz:field/';
  if (!id.startsWith(prefix)) return false;
  const rest = id.slice(prefix.length);
  return rest.length > 0 && !rest.includes('/');
}

// Collision-resolved slug map; pure (never mutates input)
export function slugFields(names) {
  const seen = new Map();
  return Array.from(names, (name) => {
    const base = slug(name);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : base + '-' + count;
  });
}
