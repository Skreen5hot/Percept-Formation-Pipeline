// THE CLAIM-LEDGER for the FSDD manifest -- instance 1 of the Auditor capability. The Auditor is the OCE's
// stance turned reflexive: where the OCE adjudicates whether a binding's claims are witnessed by a law, the
// Auditor adjudicates whether a FACTORY-EMITTED artifact's claims are witnessed by what actually ran. Each
// entry names a property the manifest ASSERTS and the WITNESS that must back it; an unwitnessed claim is a
// violation (the OCE refuses rather than guesses; so does this).
//
// HUMAN-RATIFIED GROUND TRUTH (Aaron, 2026-06-25). The gate is only as honest as this ledger, exactly as the
// Architect's fidelity gate is only as honest as the canonical domain model. This is the load-bearing
// judgment; everything else is mechanism.
//
// Two CAPABILITY contracts every ledger inherits (not PFP-specific):
//   CAP-A (witnessed exceptions): any claim that permits an exception must require it to be witnessed by an
//          artifact the engine can CHECK -- never granted by the manifest's own assertion that it applies.
//          (Instantiated here by TAINT-3's witnessed-dispute carve-out.)
//   CAP-B (completeness is a finding): an artifact assertion that falls under NO claim's witness is itself a
//          finding -- "audit: success" must mean "nothing unwitnessed", not "nothing unwitnessed in the
//          dimensions I happen to check". Enforced by the `covers`/EXEMPT coverage check (see auditor.mjs).
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
    covers: ['fsdd:hasField[].fsdd:taintDerivation'],
    applies: (ctx) => ctx.sourceKind === 'structured',
    check: (d) => fields(d)
      .filter((f) => (f['fsdd:taintDerivation'] || []).some((s) => RAW_STAGE_PREFIX.test(s)))
      .map((f) => `field ${f['fsdd:column']} claims raw-stage provenance ${JSON.stringify(f['fsdd:taintDerivation'])} but no raw stage ran (structured source)`),
  },
  {
    id: 'PROV-2-recognized-source',
    desc: 'Every field taint derivation names a recognized provenance source -- no unlabeled or garbage provenance.',
    covers: ['fsdd:hasField[].fsdd:taintDerivation'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => (f['fsdd:taintDerivation'] || []).some((s) => !SOURCE_PREFIX.test(s)))
      .map((f) => `field ${f['fsdd:column']} taint derivation ${JSON.stringify(f['fsdd:taintDerivation'])} has an unrecognized provenance source`),
  },
  {
    id: 'TAINT-3-dataset-witnessed',
    desc: 'datasetTaint equals the max of the field taints -- and may diverge to L4 ONLY on a WITNESSED dispute, never on a self-asserted flag (CAP-A).',
    covers: ['fsdd:datasetTaint'],
    applies: () => true,
    check: (d) => {
      const maxField = fields(d).reduce((m, f) => (LV.indexOf(f['fsdd:taintLevel'] || 'L0') > LV.indexOf(m) ? (f['fsdd:taintLevel'] || 'L0') : m), 'L0');
      const ds = d['fsdd:datasetTaint'];
      if (ds === maxField) return [];
      // CAP-A: the L4 carve-out is honest only if the dispute is one the engine can CHECK, not one the manifest
      // grants itself. The witness is the COHERENT dispute signature the emit dispute-path actually produces:
      // datasetStatus 'disputed' AND every disputed record carries >=2 competing candidates. A manifest cannot
      // earn L4 by setting a boolean it controls; it must carry the full, self-consistent dispute structure.
      const disputed = d['fsdd:disputed'] || [];
      const witnessedDispute = d['fsdd:datasetStatus'] === 'disputed'
        && disputed.length >= 1
        && disputed.every((x) => Array.isArray(x['fsdd:candidates']) && x['fsdd:candidates'].length >= 2);
      if (ds === 'L4' && witnessedDispute) return [];
      return [`datasetTaint ${ds} != max field taint ${maxField} with no witnessed dispute (status 'disputed' + >=2 candidates) -- unwitnessed or self-granted dataset taint`];
    },
  },
  {
    id: 'FIELD-4-bound-roles-present',
    desc: 'Every role that resolved appears as a field -- no silent drop of resolved roles (constitutive OR accidental).',
    covers: ['fsdd:hasField[].fsdd:role'],
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
    // PRESENCE, never ADEQUACY (ratified). It refuses a role-bearing field whose grounded concept is
    // STRUCTURALLY ABSENT. It does NOT judge whether the concept is the correct/good one -- that is the
    // semantic tier a mechanical gate cannot supply. NAMED CEILING: concept-adequacy (is fan:Customer the
    // RIGHT concept for this column?) is out of scope for this gate and must not be inferred from a green here.
    desc: 'Every role-bearing field carries a grounded concept (PRESENCE only; adequacy of the concept is a named ceiling, not checked).',
    covers: ['fsdd:hasField[].fsdd:groundedConcept'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => f['fsdd:role'] && !(f['fsdd:groundedConcept'] && f['fsdd:groundedConcept']['@id']))
      .map((f) => `field ${f['fsdd:column']} has role ${f['fsdd:role']} but no grounded concept present (lost semantics)`),
  },
  {
    id: 'STATUS-6-recognized',
    desc: 'datasetStatus is a recognized adjudication verdict (or absent on an honestly-degraded dictionary).',
    covers: ['fsdd:datasetStatus'],
    applies: () => true,
    check: (d) => (['succeeds', 'incomplete', 'fails', 'disputed', undefined].includes(d['fsdd:datasetStatus'])
      ? [] : [`unrecognized datasetStatus ${JSON.stringify(d['fsdd:datasetStatus'])}`]),
  },
];

// EXEMPT property-paths: NOT truth-claims the FSDD originates -- structural framing or verbatim echoes of
// upstream inputs (the cism/schema/binding it was handed). CAP-B requires every artifact assertion to be
// EITHER witnessed by a claim OR explicitly exempt here; anything in neither set is a finding. This list is
// the ledger author CONSCIOUSLY answering for each property -- an unclassified property is the silent omission.
export const FSDD_EXEMPT = [
  '@context', '@type', 'dcterms:title', 'prov:wasAttributedTo',
  'fsdd:hasField',                           // structural container (its MEMBERS are classified individually)
  'fsdd:rawInputHash',                       // verbatim echo of schema viz:rawInputHash
  'fsdd:hasField[].@type', 'fsdd:hasField[].fsdd:column',
  'fsdd:hasField[].fsdd:typeDistribution',        // echo of cism
  'fsdd:hasField[].csvw:datatype', 'fsdd:hasField[].fsdd:nullable',
  'fsdd:hasField[].fsdd:semanticType', 'fsdd:hasField[].fsdd:consensus', 'fsdd:hasField[].sas:alignmentRule',
  'fsdd:hasField[].fsdd:fillerKind', 'fsdd:hasField[].fsdd:convergence', 'fsdd:hasField[].fsdd:confidence',
];
