import { unknownDecision } from './decision.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function validateField(field) {
  const sumDist = Object.values(field.typeDistribution).reduce((a, b) => a + b, 0);
  if (
    field.occurrences < 0 ||
    sumDist > field.occurrences ||
    field.nullCount > field.occurrences
  ) {
    return unknownDecision('cism-validation-failed', {
      score: '0.000000',
      numerator: 0,
      denominator: 0,
      structuralType: field.primitiveType,
      diagnostics: [makeDiagnostic('SAS-013', field)],
    });
  }
  return null;
}
