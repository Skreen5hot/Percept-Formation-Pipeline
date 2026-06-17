export function generateCandidates(scope, lexis, context, config) {
  const seed = {
    topic: context && context.topicHint,
    heads: Object.values(lexis || {}).map(f => f.head)
  };
  if (typeof scope.retrieveFrames !== 'function') return [];
  const raw = scope.retrieveFrames(seed);
  const seen = new Set();
  const deduped = [];
  for (const id of raw) {
    if (!seen.has(id)) { seen.add(id); deduped.push(id); }
  }
  return deduped.slice(0, config.maxCandidateFrames);
}
