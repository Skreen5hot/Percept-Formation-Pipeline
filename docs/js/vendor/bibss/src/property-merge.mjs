import { foldResolve, isInteger } from './primitive-resolve.mjs';
import { makeObjectChildId } from './ids.mjs';

function primitiveTypeOf(v) {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return isInteger(v) ? 'integer' : 'number';
  return 'string';
}

export function mergeObjectProperties(elements, requiredThreshold, parentId, inferValueFn) {
  const nonNull = elements.filter(e => e !== null && e !== undefined);
  const N = nonNull.length;

  if (N === 0) {
    return { kind: 'object', properties: {} };
  }

  const keySet = new Set();
  for (const el of nonNull) {
    for (const k of Object.keys(el)) {
      keySet.add(k);
    }
  }

  const properties = {};

  for (const k of keySet) {
    const presentElements = nonNull.filter(el => Object.hasOwn(el, k));
    const occurrences = presentElements.length;
    const values = presentElements.map(el => el[k]);
    const nullable = values.some(v => v === null);
    const required = (occurrences / N) >= requiredThreshold;
    const nonNullValues = values.filter(v => v !== null);

    let targetNode;

    if (nonNullValues.length === 0) {
      targetNode = {
        kind: 'primitive',
        primitiveType: 'null',
        nullable: true,
        typeDistribution: { null: values.length },
      };
    } else {
      const allPrimitive = nonNullValues.every(v => typeof v !== 'object');

      if (allPrimitive) {
        const typeDistribution = {};
        const typesForFold = [];
        for (const v of values) {
          const t = v === null ? 'null' : primitiveTypeOf(v);
          typeDistribution[t] = (typeDistribution[t] || 0) + 1;
          typesForFold.push(t);
        }
        const resolved = foldResolve(typesForFold);
        targetNode = {
          kind: 'primitive',
          primitiveType: resolved.type,
          nullable: resolved.nullable,
          typeDistribution,
        };
      } else {
        const childId = makeObjectChildId(parentId, k);
        targetNode = inferValueFn(nonNullValues, childId);
        if (nullable) {
          targetNode = Object.assign({}, targetNode, { nullable: true });
        }
      }
    }

    properties[k] = { required, nullable, targetNode };
  }

  return { kind: 'object', properties };
}
