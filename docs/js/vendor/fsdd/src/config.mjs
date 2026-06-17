export function mergeConfig(config = {}) {
  return {
    includeProvenanceChain: config.includeProvenanceChain ?? true,
    probabilisticTaintBump: config.probabilisticTaintBump ?? false,
    emitStandardsPureView: config.emitStandardsPureView ?? false,
    implicitEntityDepth: config.implicitEntityDepth ?? 1,
  };
}
