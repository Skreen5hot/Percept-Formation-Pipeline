import { lawReference } from './lawRef.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function implicitEntities(emptyNecessities, recordConcept, lawHash, lawRegistry, config = {}) {
  const records = [];
  const diagnostics = [];
  const depth = (config.implicitEntityDepth != null && config.implicitEntityDepth > 1) ? 1 : 1;
  const clamped = config.implicitEntityDepth != null && config.implicitEntityDepth > 1;

  if (clamped) {
    diagnostics.push(makeDiagnostic('FSDD-012', { requestedDepth: config.implicitEntityDepth, clampedTo: 1 }));
  }

  for (const necessity of emptyNecessities) {
    const relation = necessity['oce:relation'];
    const requiredType = necessity['oce:requiredType'];
    const lawRef = lawReference(lawHash, lawRegistry);

    const record = {
      '@type': ['fsdd:ImplicitEntityRecord', 'iao:InformationContentEntity'],
      'fsdd:concernsType': { '@id': requiredType },
      'fsdd:derivedFrom': 'constitutive necessity ' + relation + ' of ' + recordConcept,
      'fsdd:status': 'empty',
      'fsdd:perceptGrounded': true,
      'fsdd:depth': 1,
      'fsdd:adjudicatingLaw': lawRef.ref,
      'fsdd:note': 'ICE about a constitutively-required, unwitnessed participant; not an asserted instance.'
    };

    records.push(record);
    diagnostics.push(makeDiagnostic('FSDD-004', { necessity: relation, concernsType: requiredType }));
  }

  return { records, diagnostics };
}
