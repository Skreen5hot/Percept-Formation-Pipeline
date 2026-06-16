import { createBIBSS } from './vendor/bibss/src/bibss.mjs';

// BIBSS.project(cism,'cism') returns a wrapper { version, generatedAt, config, root }. The CISM tree is
// under .root; for tabular input root.kind === 'object' and each column is root.properties[field] = an
// edge { required, nullable, targetNode } whose targetNode (a primitive node) carries primitiveType +
// typeDistribution. We flatten the top-level columns to one node per field; edges are the structural
// object->property relations (NOT semantic field-to-field relationships -- the UI states that).
export function infer(cleanedCSV) {
  const bibss = createBIBSS();
  const { cism } = bibss.infer(cleanedCSV, {});
  const projected = bibss.project(cism, 'cism');
  const root = projected.root || projected;

  const flatNodes = [];
  const edges = [];
  if (root.properties) {
    for (const [field, edge] of Object.entries(root.properties)) {
      const t = edge.targetNode || {};
      flatNodes.push({
        field,
        primitiveType: t.primitiveType ?? t.kind ?? '',
        typeDistribution: t.typeDistribution || {},
        nullable: edge.nullable ?? t.nullable ?? false,
      });
      edges.push({ from: 'root', key: field, required: edge.required, occurrences: edge.occurrences });
    }
  }
  return { flatNodes, edges };
}
