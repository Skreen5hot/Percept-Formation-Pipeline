import { foldResolve } from './primitive-resolve.mjs';
import { mergeObjectProperties } from './property-merge.mjs';
import { getPrimitiveKind, classifyElements } from './array-infer.mjs';
import { makeDiagnostic, makeUnionMemberId } from './ids.mjs';
import { DIAG } from './types.mjs';

// Rule 3 cross-kind union detection (§8.5.2, §8.5.4).
// kindGroups: { primitive?: unknown[], object?: object[], array?: unknown[][] }
// nullCount: count of null elements in the original element set
// config: InferConfig (requiredThreshold used for object merge)
// parentId: JSON Pointer id for the union node
// inferValueFn: recursive inference callback forwarded to mergeObjectProperties
export function buildCrossKindUnion(kindGroups, nullCount, config, parentId, inferValueFn) {
  const members = [];
  const diagnostics = [];
  let memberIndex = 0;
  const requiredThreshold = (config != null && config.requiredThreshold != null)
    ? config.requiredThreshold
    : 1.0;

  // Primitive group: foldResolve lattice + typeDistribution accumulation
  if (kindGroups.primitive && kindGroups.primitive.length > 0) {
    const primitiveKinds = kindGroups.primitive.map(v => getPrimitiveKind(v));
    const typeDistribution = {};
    for (const kind of primitiveKinds) {
      typeDistribution[kind] = (typeDistribution[kind] || 0) + 1;
    }
    const resolved = foldResolve(primitiveKinds);
    const memberId = makeUnionMemberId(parentId, memberIndex++);
    members.push({
      kind: 'primitive',
      primitiveType: resolved.type,
      nullable: resolved.nullable,
      typeDistribution,
      id: memberId
    });
  }

  // Object group: property-merge + BIBSS-008 guard
  if (kindGroups.object && kindGroups.object.length > 0) {
    const objectElements = kindGroups.object;
    const allKeys = new Set();
    for (const obj of objectElements) {
      if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const key of Object.keys(obj)) {
          allKeys.add(key);
        }
      }
    }
    if (allKeys.size > 100) {
      diagnostics.push(makeDiagnostic(
        'warning',
        DIAG.BIBSS_008,
        `Cross-kind union: ${allKeys.size} distinct property keys across object elements exceeds limit of 100`,
        { parentId, keyCount: allKeys.size }
      ));
    }
    const memberId = makeUnionMemberId(parentId, memberIndex++);
    const objectNode = mergeObjectProperties(objectElements, requiredThreshold, memberId, inferValueFn);
    members.push({ ...objectNode, id: memberId });
  }

  // Array group: collect inner elements and classify via M07 classifyElements
  if (kindGroups.array && kindGroups.array.length > 0) {
    const memberId = makeUnionMemberId(parentId, memberIndex++);
    const innerElements = [];
    for (const arr of kindGroups.array) {
      if (Array.isArray(arr)) {
        for (const el of arr) {
          innerElements.push(el);
        }
      }
    }
    const itemType = classifyElements(innerElements, memberId, requiredThreshold);
    members.push({
      kind: 'array',
      itemType,
      nullable: false,
      id: memberId
    });
  }

  const result = {
    kind: 'union',
    members,
    nullable: nullCount > 0,
    id: parentId
  };

  if (diagnostics.length > 0) {
    result.diagnostics = diagnostics;
  }

  return result;
}
