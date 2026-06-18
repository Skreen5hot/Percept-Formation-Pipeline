import { roleSlots, subsumes } from './lawAdapter.mjs';
import { localName, KIND, STATUS } from './types.mjs';

// Inherence-Completion capability (clinical-measurement-frame-01 v0.2.1 section 11).
// On the ProposedBinding path, a FILLED constitutive QUALITY role (e.g. measuresQuality, the witnessed
// glucose value) entails an EMPTY material BEARER the law requires that quality to inhere in (the specimen):
// a quality must inhere in a material continuant, never in the process. This SUPERSEDES the bearer role's
// plain relational empty necessity with an inherence-kind one carrying the witnessed quality as STRUCTURED
// fields, so the FSDD cites the AXIOM (the non-obvious "the value entails the specimen by necessity")
// instead of the bare relational template -- and the FSDD never has to parse prose.
//
// Additive + bounded: only rewrites EMPTY bearer necessities; never touches a fulfilled/violated verdict
// (accidental-invariance); a no-op when there is no filled quality role or the bearer is filled. SHIPPING is
// a verified no-op (no shipping frame role's range subsumes bfo:Quality -- fan:Mass is a property, not a
// role slot), so the existing Appendix-A verdicts are untouched.

const QUALITY = 'bfo:Quality';

// The inherence property whose domain subsumes the witnessed quality Q, choosing the MOST-SPECIFIC matching
// domain by subsumption (so a clinical analyte resolves to fan:analyteInheresIn [domain fan:Analyte], not
// shipping's broader fan:inheresIn [domain bfo:Quality], in the merged law). Returns {relation, requiredBearer}.
function inherenceForQuality(law, Q) {
  const cands = [];
  for (const key of Object.keys(law.properties || {})) {
    const prop = law.properties[key];
    if (prop.inherenceNecessity !== true) continue;
    if (!Object.prototype.hasOwnProperty.call(prop, 'requiredBearer') || !prop.domain) continue;
    if (subsumes(law, Q, prop.domain)) {
      cands.push({ relation: localName(key), domain: prop.domain, requiredBearer: prop.requiredBearer });
    }
  }
  if (!cands.length) return null;
  let best = cands[0];
  for (const c of cands) {
    // c is strictly more specific than best when c.domain subClassOf best.domain
    if (c.domain !== best.domain && subsumes(law, c.domain, best.domain)) best = c;
  }
  return best;
}

export function inherenceComplete(law, normalized, necessities) {
  if (!normalized || !normalized.recordConcept) return necessities;   // binding path only
  const slots = roleSlots(law, normalized.recordConcept);
  const edges = normalized.edges || [];
  for (const slot of slots) {
    const edge = edges.find((e) => e.relation === localName(slot.role));
    if (!edge || edge.relatumConcept == null) continue;               // the quality role must be FILLED
    const Q = edge.relatumConcept;
    if (!subsumes(law, Q, QUALITY)) continue;                         // the witnessed relatum must be a quality
    const inh = inherenceForQuality(law, Q);
    if (!inh) continue;
    const B = inh.requiredBearer;
    for (const bslot of slots) {
      if (!subsumes(law, bslot.relatumType, B)) continue;             // a bearer role whose range subsumes-to B
      const brel = localName(bslot.role);
      const idx = necessities.findIndex(
        (n) => n['oce:relation'] === brel && n['oce:status'] === STATUS.EMPTY);
      if (idx === -1) continue;                                       // supersede only an EMPTY bearer (exactly once)
      necessities[idx] = {
        'oce:relation': inh.relation,
        'oce:kind': KIND.INHERENCE,
        'oce:requiredType': bslot.relatumType,        // keeps FSDD concernsType = the bearer (e.g. fan:Specimen)
        'oce:inheresQuality': Q,                       // structured: the witnessed quality (e.g. fan:GlucoseConcentration)
        'oce:requiredBearer': B,                       // structured: the required bearer kind
        'oce:status': STATUS.EMPTY,
        'oce:fulfilledBy': null,
        'oce:evidence': `${Q} ${inh.relation} requires a ${B} bearer (constitutive inherence); the measured `
          + 'quality is witnessed, its bearer is not',
      };
    }
  }
  return necessities;
}
