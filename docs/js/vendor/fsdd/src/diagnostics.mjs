export const LEVELS = {
  'FSDD-001': 'info',
  'FSDD-002': 'info',
  'FSDD-003': 'warning',
  'FSDD-004': 'info',
  'FSDD-005': 'warning',
  'FSDD-006': 'warning',
  'FSDD-007': 'info',
  'FSDD-008': 'error',
  'FSDD-009': 'warning',
  'FSDD-010': 'info',
  'FSDD-011': 'info',
  'FSDD-012': 'info',
};

export function makeDiagnostic(code, extra = {}) {
  return { code, level: LEVELS[code], ...extra };
}
