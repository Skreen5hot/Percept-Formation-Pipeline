export const LEVELS = {
  'BIND-001': 'warning',
  'BIND-002': 'info',
  'BIND-003': 'warning',
  'BIND-004': 'warning',
  'BIND-005': 'info',
  'BIND-006': 'info',
  'BIND-007': 'warning',
  'BIND-008': 'info'
};

export function makeDiagnostic(code, extra = {}) {
  return { code, level: LEVELS[code], ...extra };
}
