import { consensus, nonNullTotal, formatScore, LATTICE } from './consensus.mjs';
import { mapType, NOMINAL, QUANTITATIVE, BOOLEAN, TEMPORAL, UNKNOWN } from './types.mjs';
import { makeDecision, unknownDecision } from './decision.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

const DEFAULT_TEMPORAL_PATTERN = '(?:date|time|timestamp|created|updated|modified|born|died|started|ended|expires?)(?:_at|_on|_time)?$';

export function classifyStatic(field, config = {}, snp = null) {
  const { name, kind, primitiveType, occurrences } = field;

  // (a) NULL-VOCAB reclassification (6.4, field-specific only)
  let working = field.typeDistribution;
  let reclassified = false;
  let reclassifiedCount = 0;

  if (
    config.nullVocabulary &&
    Array.isArray(config.nullVocabulary[name]) &&
    config.nullVocabulary[name].length > 0
  ) {
    const stringCount = working['string'] || 0;
    if (stringCount > 0) {
      working = Object.assign({}, working);
      working['null'] = (working['null'] || 0) + stringCount;
      delete working['string'];
      reclassifiedCount = stringCount;
      reclassified = true;
    }
  }

  const occ = occurrences;

  // (b) null-vocab exhaustion
  if (reclassified && nonNullTotal(working, occ) === 0) {
    const d = unknownDecision('structural-passthrough', {
      score: '0.000000',
      numerator: 0,
      denominator: 0,
      diagnostics: [makeDiagnostic('SAS-008', name, { reclassifiedCount })],
    });
    d.structuralType = primitiveType;
    return d;
  }

  // (c) unknown-assignment: union, all-null primitiveType, or no non-null obs
  if (kind === 'union' || primitiveType === 'null' || nonNullTotal(working, occ) <= 0) {
    const d = unknownDecision('unknown-assignment', {
      diagnostics: [makeDiagnostic('SAS-002', name)],
    });
    d.structuralType = primitiveType;
    return d;
  }

  // (d) min observation threshold
  const minObs = config.minObservationThreshold ?? 5;
  const nn = nonNullTotal(working, occ);
  if (nn < minObs) {
    const d = unknownDecision('consensus-promotion', {
      score: '0.000000',
      numerator: 0,
      denominator: nn,
      diagnostics: [makeDiagnostic('SAS-012', name)],
    });
    d.structuralType = primitiveType;
    return d;
  }

  // (e) main classification
  const c = consensus(working, occ, {
    threshold: config.consensusThreshold ?? 0.95,
    minObs,
  });
  const nonNullTypes = Object.keys(working).filter(t => t !== 'null' && working[t] > 0);

  // STRUCTURAL PASSTHROUGH (single unanimous non-string type)
  if (nonNullTypes.length === 1 && nonNullTypes[0] !== 'string') {
    const m = mapType(nonNullTypes[0]);
    const rule = reclassified ? 'null-vocabulary-configured' : 'structural-passthrough';
    const diags = reclassified ? [makeDiagnostic('SAS-008', name, { reclassifiedCount })] : [];
    const d = makeDecision({
      rule,
      dataType: m.dataType,
      numericPrecision: m.numericPrecision,
      score: '1.000000',
      numerator: nn,
      denominator: nn,
      diagnostics: diags,
    });
    d.structuralType = primitiveType;
    return d;
  }

  // CONSENSUS PROMOTION (non-string type passed threshold)
  if (c.subcase === 'success' && c.winnerType !== 'string') {
    const m = mapType(c.winnerType);
    const rule = reclassified ? 'null-vocabulary-configured' : 'consensus-promotion';
    const diags = reclassified ? [makeDiagnostic('SAS-008', name, { reclassifiedCount })] : [];
    const d = makeDecision({
      rule,
      dataType: m.dataType,
      numericPrecision: m.numericPrecision,
      score: c.score,
      numerator: c.numerator,
      denominator: c.denominator,
      diagnostics: diags,
    });
    d.structuralType = primitiveType;
    return d;
  }

  // BASE TYPE IS NOMINAL -- determine base rule/score/num/den/diags
  let baseRule, baseScore, baseNum, baseDen, baseDiags;

  if (c.subcase === 'no_consensus') {
    baseRule = 'consensus-promotion';
    baseScore = c.score;
    baseNum = c.numerator;
    baseDen = c.denominator;
    baseDiags = [makeDiagnostic('SAS-001', name)];
  } else {
    // subcase 'success' with a string winner
    if (nonNullTypes.length === 1) {
      baseRule = 'structural-passthrough';
      baseScore = '1.000000';
      baseNum = nn;
      baseDen = nn;
    } else {
      baseRule = 'consensus-promotion';
      baseScore = c.score;
      baseNum = c.numerator;
      baseDen = c.denominator;
    }
    baseDiags = [];
  }

  // Check if string passed threshold (for temporal detection step ii)
  const threshold = config.consensusThreshold ?? 0.95;
  const THRESH_SCALE = 1000000;
  const scaledThreshold = Math.round(threshold * THRESH_SCALE);
  const stringCount = working['string'] || 0;
  const stringPassedThreshold = stringCount * THRESH_SCALE >= scaledThreshold * nn;

  // STRING REFINEMENT
  // (i) SNP temporal evidence
  if (snp && Array.isArray(snp.entries)) {
    const entry = snp.entries.find(
      e => e.detail && e.detail.type === 'date_converted' &&
           typeof e.path === 'string' &&
           e.path.toLowerCase() === name.toLowerCase()
    );
    if (entry) {
      const d = makeDecision({
        rule: 'temporal-detection-snp-evidence',
        dataType: TEMPORAL,
        score: baseScore,
        numerator: baseNum,
        denominator: baseDen,
        diagnostics: [makeDiagnostic('SAS-009', name)],
      });
      d.structuralType = primitiveType;
      return d;
    }
  }

  // (ii) temporal via name pattern
  if (
    primitiveType === 'string' &&
    stringPassedThreshold
  ) {
    const pattern = config.temporalNamePattern ?? DEFAULT_TEMPORAL_PATTERN;
    if (new RegExp(pattern, 'i').test(name)) {
      const d = makeDecision({
        rule: 'temporal-detection',
        dataType: TEMPORAL,
        score: baseScore,
        numerator: baseNum,
        denominator: baseDen,
        diagnostics: [makeDiagnostic('SAS-010', name)],
      });
      d.structuralType = primitiveType;
      return d;
    }
  }

  // (iii) boolean pair configured
  if (config.booleanFields && (name in config.booleanFields) && primitiveType === 'string') {
    const d = makeDecision({
      rule: 'boolean-pair-configured',
      dataType: BOOLEAN,
      score: '1.000000',
      numerator: nn,
      denominator: nn,
      diagnostics: [],
    });
    d.structuralType = primitiveType;
    return d;
  }

  // (iv) nominal base
  const d = makeDecision({
    rule: baseRule,
    dataType: NOMINAL,
    score: baseScore,
    numerator: baseNum,
    denominator: baseDen,
    diagnostics: baseDiags,
  });
  d.structuralType = primitiveType;
  return d;
}
