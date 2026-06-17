export const LEVELS = {
  'OCE-001': 'error',
  'OCE-002': 'warning',
  'OCE-003': 'error',
  'OCE-004': 'warning',
  'OCE-005': 'warning',
  'OCE-006': 'info',
  'OCE-007': 'info',
  'OCE-008': 'warning',
};

export function makeDiagnostic(code, extra = {}) {
  return { code, level: LEVELS[code], ...extra };
}
