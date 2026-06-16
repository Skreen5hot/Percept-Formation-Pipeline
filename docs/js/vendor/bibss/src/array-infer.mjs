import { isInteger, foldResolve } from './primitive-resolve.mjs';
import { mergeObjectProperties } from './property-merge.mjs';
import { makeDiagnostic } from './ids.mjs';
import { DIAG } from './types.mjs';

export function getCompositeKind(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'object';
  return 'primitive';
}

export function getPrimitiveKind(v) {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return isInteger(v) ? 'integer' : 'number';
  return 'string';
}

export function classifyElements(elements, parentId = '#/[]', requiredThreshold = 1.0) {
  if (elements.length === 0) {
    return {
      node: null,
      diagnostics: [makeDiagnostic('warning', DIAG.BIBSS_007, 'Array has zero elements; itemType is null')]
    };
  }

  const nonNullEls = elements.filter(v => v !== null);
  const hasNulls = nonNullEls.length < elements.length;

  if (nonNullEls.length === 0) {
    return {
      node: { kind: 'primitive', primitiveType: 'null', nullable: true },
      diagnostics: []
    };
  }

  const nonNullKinds = nonNullEls.map(getCompositeKind);
  const kindSet = new Set(nonNullKinds);

  if (kindSet.size > 1) {
    // Rule 3: multiple composite kinds — delegated to M08
    return { node: null, diagnostics: [] };
  }

  const kind = nonNullKinds[0];

  if (kind === 'primitive') {
    const primKinds = nonNullEls.map(getPrimitiveKind);
    const typeDist = {};
    for (const pk of primKinds) typeDist[pk] = (typeDist[pk] || 0) + 1;
    if (hasNulls) typeDist['null'] = elements.length - nonNullEls.length;
    const resolved = foldResolve(primKinds);
    return {
      node: {
        kind: 'primitive',
        primitiveType: resolved.type,
        nullable: hasNulls,
        typeDistribution: typeDist
      },
      diagnostics: []
    };
  }

  if (kind === 'object') {
    const inferFn = makeInferFn(requiredThreshold);
    const node = mergeObjectProperties(nonNullEls, requiredThreshold, parentId, inferFn);
    node.nullable = hasNulls;
    return { node, diagnostics: [] };
  }

  if (kind === 'array') {
    const innerEls = nonNullEls.flatMap(arr => arr);
    const innerResult = classifyElements(innerEls, parentId, requiredThreshold);
    return {
      node: { kind: 'array', itemType: innerResult.node, nullable: hasNulls },
      diagnostics: innerResult.diagnostics
    };
  }

  return { node: null, diagnostics: [] };
}

function makeInferFn(requiredThreshold) {
  const inferFn = (vals, id) => {
    const nonNull = vals.filter(v => v !== null);
    const hasNulls = nonNull.length < vals.length;
    if (nonNull.length === 0) {
      return { kind: 'primitive', primitiveType: 'null', nullable: true };
    }
    const kind = getCompositeKind(nonNull[0]);
    if (kind === 'object') {
      const node = mergeObjectProperties(nonNull, requiredThreshold, id, inferFn);
      node.nullable = hasNulls;
      return node;
    }
    if (kind === 'array') {
      const inner = nonNull.flatMap(a => a);
      const result = classifyElements(inner, id, requiredThreshold);
      return { kind: 'array', itemType: result.node, nullable: hasNulls };
    }
    const primKinds = nonNull.map(getPrimitiveKind);
    const typeDist = {};
    for (const pk of primKinds) typeDist[pk] = (typeDist[pk] || 0) + 1;
    if (hasNulls) typeDist['null'] = vals.length - nonNull.length;
    const resolved = foldResolve(primKinds);
    return { kind: 'primitive', primitiveType: resolved.type, nullable: hasNulls, typeDistribution: typeDist };
  };
  return inferFn;
}
