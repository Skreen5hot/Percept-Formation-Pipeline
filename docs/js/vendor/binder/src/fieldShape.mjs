export function classifyFieldShape(field, lexis) {
  if (!lexis) return 'literal';
  return Array.isArray(lexis.markers) && lexis.markers.includes('id') ? 'reference' : 'literal';
}
