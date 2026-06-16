export const LEVELS = {
  'SAS-001': 'warning',
  'SAS-002': 'info',
  'SAS-003': 'info',
  'SAS-004': 'info',
  'SAS-007': 'fatal',
  'SAS-008': 'info',
  'SAS-009': 'info',
  'SAS-010': 'info',
  'SAS-012': 'warning',
  'SAS-013': 'fatal',
};

export function makeDiagnostic(code, field, extra = {}) {
  return { code, level: LEVELS[code], field, ...extra };
}
