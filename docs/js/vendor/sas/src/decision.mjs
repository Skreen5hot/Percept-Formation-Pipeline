import { UNKNOWN } from './types.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function makeDecision(spec) {
  return {
    rule: spec.rule,
    dataType: spec.dataType,
    numericPrecision: spec.numericPrecision,
    structuralType: spec.structuralType,
    score: spec.score,
    numerator: spec.numerator !== undefined ? spec.numerator : 0,
    denominator: spec.denominator !== undefined ? spec.denominator : 0,
    diagnostics: spec.diagnostics !== undefined ? spec.diagnostics : [],
    extraProps: spec.extraProps !== undefined ? spec.extraProps : {},
  };
}

export function unknownDecision(rule, opts = {}) {
  return makeDecision({
    rule,
    dataType: UNKNOWN,
    score: '0.000000',
    numerator: 0,
    denominator: 0,
    structuralType: opts.structuralType,
    diagnostics: opts.diagnostics || [],
  });
}
