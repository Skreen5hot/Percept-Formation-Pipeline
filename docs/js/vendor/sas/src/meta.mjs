export function totalRows(root) {
  if (root.sampling && root.sampling.applied) return root.sampling.inputSize;
  if (root.kind === 'array' || root.itemType) return root.itemType.occurrences;
  return root.occurrences;
}

export function rootMeta(root, rawHash) {
  return {
    'viz:rawInputHash': rawHash,
    'viz:totalRows': totalRows(root),
  };
}
