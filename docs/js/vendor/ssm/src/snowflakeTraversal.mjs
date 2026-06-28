import { resolveKey } from './krs.mjs';

export { resolveKey as hopResolver };

export function traverse({ subjectRefTable, subjectRow, mapping, dimsData, query }) {
  const dimDef = mapping['ssm:dimensions'][subjectRefTable];
  const outgoingFKs = dimDef['ssm:outgoingFKs'];
  if (!Array.isArray(outgoingFKs) || outgoingFKs.length === 0) return [];

  return outgoingFKs.map(entry => {
    const fk = entry['ssm:fkColumn'];
    const refTable = entry['ssm:refTable'];
    const role = entry['ssm:role'];
    const nullable = entry['ssm:nullable'];
    const key = subjectRow[fk];
    const r = resolveKey({
      fkValue: key,
      candidates: dimsData[refTable] || [],
      validInstant: query.validInstant,
      assertionHorizon: query.assertionHorizon
    });
    const concept = mapping['ssm:dimensions'][refTable]['ssm:entityClass'];

    const base = { role, fkColumn: fk, refTable, concept, nullable };

    if (r.state === 'resolved') {
      return { ...base, outcome: 'resolved', resolvedKey: r.businessKey };
    } else if (r.state === 'absent') {
      return { ...base, outcome: 'absent' };
    } else {
      return { ...base, outcome: 'dangling', reason: r.reason };
    }
  });
}
