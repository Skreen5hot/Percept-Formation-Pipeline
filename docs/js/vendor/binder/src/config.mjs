export function mergeConfig(config = {}) {
  return {
    proposeThreshold: config.proposeThreshold ?? 0.75,
    commitThreshold: config.commitThreshold ?? 0.45,
    maxCandidateFrames: config.maxCandidateFrames ?? 12,
    weights: {
      coverage: config.weights?.coverage ?? 1,
      residue: config.weights?.residue ?? 1,
      convergence: config.weights?.convergence ?? 1
    }
  };
}
