import { STATUS } from './types.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function structuralCheck(necResult, edge, percept, config = {}) {
  if (!percept || config.checkStructuralConsistency === false) {
    return { result: necResult };
  }

  if (necResult['oce:status'] !== STATUS.FULFILLED) {
    return { result: necResult };
  }

  const field = percept[edge.fieldId];
  if (!field) {
    return { result: necResult };
  }

  const relation = necResult['oce:relation'];

  if (field.cardinality === 'high' || field.functional === false) {
    const diagnostic = makeDiagnostic('OCE-004', { relation, fieldId: edge.fieldId });
    return {
      result: { ...necResult, 'oce:status': STATUS.VIOLATED },
      diagnostic
    };
  }

  if (field.role === 'identity' && (field.textFree === true || field.repetition === 'low')) {
    const diagnostic = makeDiagnostic('OCE-005', { relation, fieldId: edge.fieldId });
    return {
      result: { ...necResult, 'oce:status': STATUS.EMPTY },
      diagnostic
    };
  }

  return { result: necResult };
}
