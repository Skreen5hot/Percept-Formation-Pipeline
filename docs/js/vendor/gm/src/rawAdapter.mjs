export function adaptRaw(rawFSDD, rows, recordConcept) {
  try {
    const datasetStatus = rawFSDD['fsdd:datasetStatus'];
    const roles = (rawFSDD['fsdd:hasField'] || [])
      .filter(f => f['fsdd:role'])
      .map(f => ({
        role: f['fsdd:role'],
        column: f['fsdd:column'],
        concept: (f['fsdd:groundedConcept'] || {})['@id'],
        fillerKind: f['fsdd:fillerKind'],
        status: f['fsdd:fulfillmentStatus']
      }));
    const ices = (rawFSDD['fsdd:hasImplicitEntity'] || [])
      .map(i => ({
        role: i['fsdd:role'],
        concernsType: (i['fsdd:concernsType'] || {})['@id']
      }));
    return { recordConcept, datasetStatus, roles, ices, rows };
  } catch (_) {
    return { recordConcept, datasetStatus: undefined, roles: [], ices: [], rows: rows || [] };
  }
}
