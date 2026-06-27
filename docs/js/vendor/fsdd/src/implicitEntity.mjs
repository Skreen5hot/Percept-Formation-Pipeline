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

    // An inherence-derived bearer (the specimen) cites the AXIOM, built from the necessity's STRUCTURED
    // fields (never parsing oce:evidence): the witnessed quality entails this bearer by inherence. A plain
    // missing constitutive role keeps the relational template -- the legible contrast the demo shows.
    const isInherence = necessity['oce:kind'] === 'inherence';
    const derivedFrom = isInherence
      ? 'required as the bearer of ' + necessity['oce:inheresQuality'] + ' by inherence ('
        + relation + '; requiredBearer ' + necessity['oce:requiredBearer'] + ')'
      : 'constitutive necessity ' + relation + ' of ' + recordConcept;

    const record = {
      '@type': ['fsdd:ImplicitEntityRecord', 'iao:InformationContentEntity'],
      'fsdd:concernsType': { '@id': requiredType },
      // §3a.1 (graph-materialization v1.5): name the absent role STRUCTURALLY, not only in fsdd:derivedFrom
      // prose. Disambiguates role-played fillers (3 fan:Date roles share concernsType). Bare-string form to
      // match fsdd:role on resolved DataFields. Extends this constructor's structured-not-prose discipline
      // (cf. fsdd:inheresQuality/requiredBearer below).
      'fsdd:role': relation,
      'fsdd:derivedFrom': derivedFrom,
      'fsdd:status': 'empty',
      'fsdd:perceptGrounded': true,
      'fsdd:depth': 1,
      'fsdd:adjudicatingLaw': lawRef.ref,
      'fsdd:note': 'ICE about a constitutively-required, unwitnessed participant; not an asserted instance.'
    };
    // carry the inherence derivation's inputs as STRUCTURED provenance (so a consumer/render composes the
    // justification from data, not by parsing fsdd:derivedFrom): the witnessed quality + the required bearer.
    if (isInherence) {
      record['fsdd:inheresQuality'] = { '@id': necessity['oce:inheresQuality'] };
      record['fsdd:requiredBearer'] = { '@id': necessity['oce:requiredBearer'] };
    }

    records.push(record);
    diagnostics.push(makeDiagnostic('FSDD-004', { necessity: relation, concernsType: requiredType }));
  }

  return { records, diagnostics };
}
