import { serializeTypeDistribution } from './type-distribution.mjs';

function serializeNode(node) {
  if (node === null) return null;

  const out = {};
  out.id = node.id;
  out.kind = node.kind;
  if (node.name !== undefined) out.name = node.name;
  out.occurrences = node.occurrences;

  if (node.kind === 'object') {
    if (node.properties !== undefined) {
      const props = {};
      for (const key of Object.keys(node.properties)) {
        const edge = node.properties[key];
        const edgeOut = {};
        edgeOut.required = edge.required;
        if (edge.nullable !== undefined) edgeOut.nullable = edge.nullable;
        edgeOut.targetNode = serializeNode(edge.targetNode);
        if (edge.occurrences !== undefined) edgeOut.occurrences = edge.occurrences;
        if (edge.totalPopulation !== undefined) edgeOut.totalPopulation = edge.totalPopulation;
        props[key] = edgeOut;
      }
      out.properties = props;
    }
  } else if (node.kind === 'array') {
    out.itemType = (node.itemType !== null && node.itemType !== undefined)
      ? serializeNode(node.itemType)
      : null;
  } else if (node.kind === 'primitive') {
    if (node.primitiveType !== undefined) out.primitiveType = node.primitiveType;
    if (node.nullable !== undefined) out.nullable = node.nullable;
    if (node.typeDistribution !== undefined && node.typeDistribution !== null) {
      out.typeDistribution = serializeTypeDistribution(node.typeDistribution);
    }
  } else if (node.kind === 'union') {
    if (node.members !== undefined) {
      out.members = node.members.map(m => serializeNode(m));
    }
    if (node.nullable !== undefined) out.nullable = node.nullable;
  }

  return out;
}

export function toCismRaw(cism) {
  const out = {};
  out.version = cism.version;
  out.generatedAt = cism.generatedAt;
  out.config = Object.assign({}, cism.config);
  out.root = serializeNode(cism.root);
  return out;
}

export function serializeCism(cism) {
  return JSON.stringify(toCismRaw(cism));
}
