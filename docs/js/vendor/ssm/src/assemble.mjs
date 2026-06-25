import { resolveKey, resolvePolymorphic } from './krs.mjs';
import { qualifiedFieldId, downProject, isFlatBindingSafe, fieldId } from './fieldId.mjs';

export function assemble(ssm, factRows, dimsData, query) {
  const systemName = ssm['ssm:source']['ssm:systemName'];
  const factDefs = ssm['ssm:facts'];
  const dimDefs = ssm['ssm:dimensions'];
  const { validInstant, assertionHorizon } = query;

  const bindings = [];
  const graph = [];
  const absent = [];
  const dangling = [];

  const emittedEntities = new Set();

  for (const factTable of Object.keys(factDefs)) {
    const factDef = factDefs[factTable];
    const recordConcept = factDef['ssm:recordConcept'];
    const roleAssignments = factDef['ssm:roleAssignments'] || [];

    // Declared FK columns keyed on DECLARATION, not per-row resolution
    const declaredFkColumns = new Set(roleAssignments
      .filter(ra => ra['ssm:fkColumn'])
      .map(ra => ra['ssm:fkColumn']));
    const declaredDiscriminatorColumns = new Set(roleAssignments
      .filter(ra => ra['ssm:discriminatorColumn'])
      .map(ra => ra['ssm:discriminatorColumn']));
    const declaredIdColumns = new Set(roleAssignments
      .filter(ra => ra['ssm:idColumn'])
      .map(ra => ra['ssm:idColumn']));

    for (const factRow of factRows) {
      // Residual = source columns MINUS all declared-FK columns (exclusion is declaration-keyed)
      const residualFieldIds = Object.keys(factRow)
        .filter(col => !declaredFkColumns.has(col) && !declaredDiscriminatorColumns.has(col) && !declaredIdColumns.has(col))
        .map(col => downProject(qualifiedFieldId(systemName, factTable, col)));

      const frame = factTable;
      let isDangling = false;
      const danglingMarkers = [];
      const roleBindings = [];
      const absentMarkers = [];
      const graphEdges = [];
      const entityFrames = [];

      for (const ra of roleAssignments) {
        const role = ra['ssm:role'];

        if (ra['ssm:discriminatorColumn']) {
          // Polymorphic FK path
          const discriminatorColumn = ra['ssm:discriminatorColumn'];
          const idColumn = ra['ssm:idColumn'];
          const typeMap = ra['ssm:typeMap'];
          const discriminatorValue = factRow[discriminatorColumn] !== undefined ? factRow[discriminatorColumn] : null;
          const idValue = factRow[idColumn] !== undefined ? factRow[idColumn] : null;

          const result = resolvePolymorphic({ discriminatorValue, idValue, typeMap, dimsData, validInstant, assertionHorizon });

          const flatDiscId = downProject(qualifiedFieldId(systemName, factTable, discriminatorColumn));

          if (result.state === 'resolved') {
            const relatumConcept = result.entityClass;
            roleBindings.push({
              role,
              relatumConcept,
              fieldId: flatDiscId,
              relatum: result.businessKey,
            });

            const fromQualId = qualifiedFieldId(systemName, factTable, idColumn);
            const toQualId = qualifiedFieldId(systemName, result.refTable, typeMap[discriminatorValue]['ssm:businessKey'] || idColumn);
            graphEdges.push({ role, from: fromQualId, to: toQualId });

            const entityKey = `${relatumConcept}::${result.businessKey}`;
            if (!emittedEntities.has(entityKey)) {
              emittedEntities.add(entityKey);
              entityFrames.push({
                frame: result.refTable,
                recordConcept: relatumConcept,
                roleBindings: [],
              });
            }
          } else if (result.state === 'absent') {
            absentMarkers.push({
              frame,
              role,
              expectedConcept: null,
              fieldId: flatDiscId,
            });
          } else if (result.state === 'dangling') {
            isDangling = true;
            danglingMarkers.push({
              frame,
              role,
              reason: result.reason,
              fieldId: flatDiscId,
            });
          }
        } else {
          // Ordinary FK path -- unchanged
          const fkColumn = ra['ssm:fkColumn'];
          const refTable = ra['ssm:refTable'];
          const fkValue = factRow[fkColumn] !== undefined ? factRow[fkColumn] : null;

          const relatumConcept = dimDefs[refTable]['ssm:entityClass'];
          const candidates = dimsData[refTable] || [];
          const result = resolveKey({ fkValue, candidates, validInstant, assertionHorizon });

          const qualId = qualifiedFieldId(systemName, factTable, fkColumn);
          const flatId = downProject(qualId);

          if (result.state === 'resolved') {
            roleBindings.push({
              role,
              relatumConcept,
              fieldId: flatId,
              relatum: result.businessKey,
            });

            const fromQualId = qualifiedFieldId(systemName, factTable, fkColumn);
            const toQualId = qualifiedFieldId(systemName, refTable, dimDefs[refTable]['ssm:businessKey']);
            graphEdges.push({ role, from: fromQualId, to: toQualId });

            const entityKey = `${relatumConcept}::${result.businessKey}`;
            if (!emittedEntities.has(entityKey)) {
              emittedEntities.add(entityKey);
              entityFrames.push({
                frame: refTable,
                recordConcept: relatumConcept,
                roleBindings: [],
              });
            }
          } else if (result.state === 'absent') {
            absentMarkers.push({
              frame,
              role,
              expectedConcept: relatumConcept,
              fieldId: flatId,
            });
          } else if (result.state === 'dangling') {
            isDangling = true;
            danglingMarkers.push({
              frame,
              role,
              reason: result.reason,
              fieldId: flatId,
            });
          }
        }
      }

      if (isDangling) {
        for (const d of danglingMarkers) dangling.push(d);
      } else {
        bindings.push({
          frame,
          recordConcept,
          roleBindings,
          residualFieldIds,
        });
        for (const ef of entityFrames) bindings.push(ef);
        for (const ge of graphEdges) graph.push(ge);
        for (const a of absentMarkers) absent.push(a);
      }
    }
  }

  return { bindings, graph, absent, dangling };
}
