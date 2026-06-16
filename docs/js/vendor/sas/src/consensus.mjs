export const THRESH_SCALE = 1000000;
export const LATTICE = ['null', 'boolean', 'integer', 'number', 'string'];

export function latticeRank(type) {
  return LATTICE.indexOf(type);
}

export function nonNullTotal(typeDistribution, occurrences) {
  return occurrences - (typeDistribution['null'] || 0);
}

export function formatScore(numerator, denominator) {
  if (denominator <= 0) return '0.000000';
  return (numerator / denominator).toFixed(6);
}

export function passesThreshold(count, nonNull, scaledThreshold) {
  return count * THRESH_SCALE >= scaledThreshold * nonNull;
}

export function tieBreak(types, typeDistribution) {
  let winner = null;
  let winnerCount = -1;
  let winnerRank = -1;
  for (const t of types) {
    const count = typeDistribution[t] || 0;
    const rank = latticeRank(t);
    if (count > winnerCount || (count === winnerCount && rank > winnerRank)) {
      winner = t;
      winnerCount = count;
      winnerRank = rank;
    }
  }
  return winner;
}

export function consensus(typeDistribution, occurrences, opts = {}) {
  const threshold = opts.threshold !== undefined ? opts.threshold : 0.95;
  const minObs = opts.minObs !== undefined ? opts.minObs : 5;
  const scaledThreshold = Math.round(threshold * THRESH_SCALE);
  const nonNull = nonNullTotal(typeDistribution, occurrences);

  if (nonNull < minObs) {
    return { subcase: 'min_obs', winnerType: null, numerator: 0, denominator: nonNull, score: '0.000000' };
  }

  const nonNullTypes = Object.keys(typeDistribution).filter(t => t !== 'null' && (typeDistribution[t] || 0) > 0);
  const passing = nonNullTypes.filter(t => passesThreshold(typeDistribution[t], nonNull, scaledThreshold));

  if (passing.length > 0) {
    const winner = tieBreak(passing, typeDistribution);
    const numerator = typeDistribution[winner];
    return { subcase: 'success', winnerType: winner, numerator, denominator: nonNull, score: formatScore(numerator, nonNull) };
  }

  const winner = tieBreak(nonNullTypes, typeDistribution);
  const numerator = winner !== null ? (typeDistribution[winner] || 0) : 0;
  return { subcase: 'no_consensus', winnerType: winner, numerator, denominator: nonNull, score: formatScore(numerator, nonNull) };
}
