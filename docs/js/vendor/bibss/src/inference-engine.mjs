import { foldResolve } from './primitive-resolve.mjs';
import { mergeObjectProperties } from './property-merge.mjs';
import { getCompositeKind, getPrimitiveKind, classifyElements } from './array-infer.mjs';
import { buildCrossKindUnion } from './cross-kind-union.mjs';
import { newTypeDistribution, accumulateTypeDistribution, serializeTypeDistribution } from './type-distribution.mjs';
import { makeRootId, makeArrayItemId } from './ids.mjs';

export function inferSchema(records, config = {}, parentId) {
  const rootId = parentId !== undefined ? parentId : makeRootId();
  const threshold = typeof config.requiredThreshold === 'number' ? config.requiredThreshold : 1.0;
  const validRecords = Array.isArray(records)
    ? records.filter(r => r !== null && typeof r === 'object' && !Array.isArray(r))
    : [];
  return mergeObjectProperties(validRecords, threshold, rootId, (vals, id) => _inferValues(vals, id, config));
}

function _inferValues(values, id, config) {
  const threshold = typeof config.requiredThreshold === 'number' ? config.requiredThreshold : 1.0;
  let nullCount = 0;
  const nonNull = [];
  for (const v of values) {
    if (v === null) nullCount++;
    else nonNull.push(v);
  }

  if (nonNull.length === 0) {
    const dist = newTypeDistribution();
    for (let i = 0; i < values.length; i++) accumulateTypeDistribution(dist, null);
    return { kind: 'primitive', primitiveType: 'null', nullable: true, typeDistribution: serializeTypeDistribution(dist) };
  }

  const kindGroups = {};
  for (const v of nonNull) {
    const ck = getCompositeKind(v);
    if (!kindGroups[ck]) kindGroups[ck] = [];
    kindGroups[ck].push(v);
  }
  const kinds = Object.keys(kindGroups);
  const nullable = nullCount > 0;

  if (kinds.length > 1) {
    return buildCrossKindUnion(kindGroups, nullCount, config, id, (vs, cid) => _inferValues(vs, cid, config));
  }

  const kind = kinds[0];

  if (kind === 'primitive') {
    const dist = newTypeDistribution();
    for (const v of values) accumulateTypeDistribution(dist, v);
    const primitiveKinds = nonNull.map(v => getPrimitiveKind(v));
    const resolved = foldResolve(primitiveKinds);
    return {
      kind: 'primitive',
      primitiveType: resolved.type,
      nullable: nullable || resolved.nullable,
      typeDistribution: serializeTypeDistribution(dist)
    };
  }

  if (kind === 'object') {
    const node = mergeObjectProperties(nonNull, threshold, id, (vs, cid) => _inferValues(vs, cid, config));
    node.nullable = nullable;
    return node;
  }

  // kind === 'array'
  const innerElements = [];
  for (const arr of nonNull) for (const el of arr) innerElements.push(el);
  const itemId = makeArrayItemId(id);
  const result = classifyElements(innerElements, itemId, threshold);
  const node = { kind: 'array', itemType: result.node, nullable };
  if (result.diagnostics && result.diagnostics.length > 0) node.diagnostics = result.diagnostics;
  return node;
}
