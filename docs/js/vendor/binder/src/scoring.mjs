export function bindingConfidence(votes) {
  let a = 0, d = 0;
  for (const v of votes) {
    if (v['bind:vote'] === 'agree') a++;
    else if (v['bind:vote'] === 'disagree') d++;
  }
  return (a + d) > 0 ? a / (a + d) : 0;
}

export function agreeCount(votes) {
  return votes.filter(v => v['bind:vote'] === 'agree').length;
}

export function coverage(filledConstitutive, totalConstitutive) {
  return totalConstitutive === 0 ? 0 : filledConstitutive / totalConstitutive;
}

export function residue(unboundCols, totalCols) {
  return totalCols === 0 ? 0 : unboundCols / totalCols;
}

export function meanConvergence(bindingConfidences) {
  if (bindingConfidences.length === 0) return 0;
  return bindingConfidences.reduce((s, c) => s + c, 0) / bindingConfidences.length;
}

export function frameScore(weights, cov, res, meanConv) {
  return weights.coverage * cov - weights.residue * res + weights.convergence * meanConv;
}

export function proposalConfidence(cov, meanConv) {
  return Math.min(1, 0.5 * cov + 0.5 * meanConv);
}

export function margin(topScore, runnerUpScore) {
  return runnerUpScore === undefined ? topScore : topScore - runnerUpScore;
}
