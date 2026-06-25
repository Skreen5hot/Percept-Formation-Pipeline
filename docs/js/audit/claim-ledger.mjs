// THE CLAIM-LEDGER for the FSDD manifest -- the "constitutive law for the artifact". The Auditor is the
// OCE's stance turned reflexive: where the OCE adjudicates whether a binding's claims are witnessed by a law,
// the Auditor adjudicates whether a FACTORY-EMITTED artifact's claims are witnessed by what actually ran. Each
// entry names a property the manifest ASSERTS and the WITNESS that must back it; an unwitnessed claim is a
// violation (the OCE refuses rather than guesses; so does this).
//
// HUMAN-RATIFIED GROUND TRUTH. Drafted by the coordinator, signed by Aaron -- the gate is only as honest as
// this ledger, exactly as the Architect's fidelity gate is only as honest as the canonical domain model. This
// is the load-bearing judgment; everything else is mechanism.
//
// Audit context: { sourceKind: 'structured' | 'raw', expectedRoles?: string[] }

const SOURCE_PREFIX = /^(structured-source|bibss|sas|binder|oce):/;
const RAW_STAGE_PREFIX = /^(bibss|sas):/;
const fields = (d) => d['fsdd:hasField'] || [];
const LV = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

export const FSDD_LEDGER = [
  {
    id: 'PROV-1-no-phantom-stage',
    desc: 'A structured-source manifest attributes NO field taint to bibss/sas -- stages that never run on already-structured input. (The exact shipped bug.)',
    applies: (ctx) => ctx.sourceKind === 'structured',
    check: (d) => fields(d)
      .filter((f) => (f['fsdd:taintDerivation'] || []).some((s) => RAW_STAGE_PREFIX.test(s)))
      .map((f) => `field ${f['fsdd:column']} claims raw-stage provenance ${JSON.stringify(f['fsdd:taintDerivation'])} but no raw stage ran (structured source)`),
  },
  {
    id: 'PROV-2-recognized-source',
    desc: 'Every field taint derivation names a recognized provenance source -- no unlabeled or garbage provenance.',
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => (f['fsdd:taintDerivation'] || []).some((s) => !SOURCE_PREFIX.test(s)))
      .map((f) => `field ${f['fsdd:column']} taint derivation ${JSON.stringify(f['fsdd:taintDerivation'])} has an unrecognized provenance source`),
  },
  {
    id: 'TAINT-3-dataset-witnessed',
    desc: 'datasetTaint equals the max of the field taints (or L4 on a genuine dispute) -- never a fabricated dataset-level taint.',
    applies: () => true,
    check: (d) => {
      const maxField = fields(d).reduce((m, f) => (LV.indexOf(f['fsdd:taintLevel'] || 'L0') > LV.indexOf(m) ? (f['fsdd:taintLevel'] || 'L0') : m), 'L0');
      const ds = d['fsdd:datasetTaint'];
      if (ds === maxField) return [];
      if (ds === 'L4' && (d['fsdd:disputed'] || []).length) return [];
      return [`datasetTaint ${ds} != max field taint ${maxField} (and no dispute) -- unwitnessed dataset taint`];
    },
  },
  {
    id: 'FIELD-4-bound-roles-present',
    desc: 'Every role that resolved appears as a field -- no silent drop of resolved roles (constitutive OR accidental).',
    applies: (ctx) => Array.isArray(ctx.expectedRoles),
    check: (d, ctx) => {
      const present = (d['fsdd:hasField'] || []).map((f) => String(f['fsdd:role'] || ''));
      return ctx.expectedRoles
        .filter((r) => !present.some((p) => p.includes(r)))
        .map((r) => `expected role ${r} resolved but is absent from the manifest fields (silent data loss)`);
    },
  },
  {
    id: 'FIELD-5-role-semantics-present',
    desc: 'Every role-bearing field carries its grounded concept -- the structured-source semantics reach the manifest, not just a column name.',
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => f['fsdd:role'] && !(f['fsdd:groundedConcept'] && f['fsdd:groundedConcept']['@id']))
      .map((f) => `field ${f['fsdd:column']} has role ${f['fsdd:role']} but no grounded concept (lost semantics)`),
  },
  {
    id: 'STATUS-6-recognized',
    desc: 'datasetStatus is a recognized adjudication verdict (or absent on an honestly-degraded dictionary).',
    applies: () => true,
    check: (d) => (['succeeds', 'incomplete', 'fails', 'disputed', undefined].includes(d['fsdd:datasetStatus'])
      ? [] : [`unrecognized datasetStatus ${JSON.stringify(d['fsdd:datasetStatus'])}`]),
  },
];
