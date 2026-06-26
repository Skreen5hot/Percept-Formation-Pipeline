// THE CLAIM-LEDGER for the FSDD manifest -- instance 1 of the Auditor capability. The Auditor is the OCE's
// stance turned reflexive: where the OCE adjudicates whether a binding's claims are witnessed by a law, the
// Auditor adjudicates whether a FACTORY-EMITTED artifact's claims are witnessed by what actually ran.
//
// HUMAN-RATIFIED GROUND TRUTH (Aaron, 2026-06-25). The contracts (CAP-A/CAP-B) are now ENGINE-structural
// (see auditor.mjs validateLedger): a ledger cannot EXPRESS a self-granted exception or hide an uncovered
// truth-claim in exempt. This ledger inherits them; it does not restate them.
//
// Shape: { claims:[...], exempt:[{path, reason}], deferred:[path...] }. Audit context: { sourceKind, expectedRoles? }.
import { dictionaryHash } from '../vendor/fsdd/src/jcs.mjs';

const SOURCE_PREFIX = /^(structured-source|bibss|sas|binder|oce):/;
const RAW_STAGE_PREFIX = /^(bibss|sas):/;
const fields = (d) => d['fsdd:hasField'] || [];
const LV = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const VERDICTS = ['fulfilled', 'violated', 'empty'];

const CLAIMS = [
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
    desc: 'Every field taint derivation names a recognized provenance source.',
    covers: ['fsdd:hasField[].fsdd:taintDerivation'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => (f['fsdd:taintDerivation'] || []).some((s) => !SOURCE_PREFIX.test(s)))
      .map((f) => `field ${f['fsdd:column']} taint derivation ${JSON.stringify(f['fsdd:taintDerivation'])} has an unrecognized provenance source`),
  },
  {
    id: 'TAINT-3-dataset-witnessed',
    desc: 'datasetTaint equals the max field taint -- diverging only via the witnessed-dispute exception (CAP-A).',
    covers: ['fsdd:datasetTaint', 'fsdd:disputed'],
    applies: () => true,
    check: (d) => {
      const maxField = fields(d).reduce((m, f) => (LV.indexOf(f['fsdd:taintLevel'] || 'L0') > LV.indexOf(m) ? (f['fsdd:taintLevel'] || 'L0') : m), 'L0');
      return d['fsdd:datasetTaint'] === maxField ? [] : [`datasetTaint ${d['fsdd:datasetTaint']} != max field taint ${maxField}`];
    },
    // G-1/CAP-A: the ONLY way to diverge -- a witnessed exception the ENGINE runs (auditor.mjs owns the path).
    // The witness is the coherent dispute signature the emit dispute-path produces, not a self-set flag.
    exception: {
      desc: 'L4 on a witnessed dispute (datasetStatus disputed + every dispute record carries >=2 candidates)',
      when: (d) => d['fsdd:datasetTaint'] === 'L4',
      witness: (d) => {
        const disputed = d['fsdd:disputed'] || [];
        return d['fsdd:datasetStatus'] === 'disputed' && disputed.length >= 1
          && disputed.every((x) => Array.isArray(x['fsdd:candidates']) && x['fsdd:candidates'].length >= 2);
      },
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
    desc: 'Every role-bearing field carries a grounded concept (PRESENCE only; concept-adequacy is a named ceiling, not checked).',
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
  {
    id: 'HASH-7-content-addressed',
    desc: 'dictionaryVersion is the self-verifying content hash: re-canonicalizing the dictionary (excluding the version key) reproduces it. (Load-bearing.)',
    covers: ['fsdd:dictionaryVersion'],
    applies: () => true,
    check: (d) => {
      const v = d['fsdd:dictionaryVersion'];
      if (typeof v !== 'string' || !v.startsWith('sha256:')) return [`dictionaryVersion ${JSON.stringify(v)} is not a sha256: content hash`];
      const clone = { ...d };
      delete clone['fsdd:dictionaryVersion'];
      const recomputed = 'sha256:' + dictionaryHash(clone);
      return v === recomputed ? [] : [`dictionaryVersion ${v} != recomputed ${recomputed} -- content does not hash to its asserted version`];
    },
  },
  {
    id: 'FULFILL-8-recognized-consistent',
    desc: 'Every fulfillmentStatus is recognized, and a verdict (fulfilled/violated/empty) is carried only by a field that has a role.',
    covers: ['fsdd:hasField[].fsdd:fulfillmentStatus'],
    applies: () => true,
    check: (d) => {
      const REC = ['fulfilled', 'violated', 'empty', 'n/a', 'contested'];
      const out = [];
      for (const f of fields(d)) {
        const s = f['fsdd:fulfillmentStatus'];
        if (!REC.includes(s)) out.push(`field ${f['fsdd:column']} fulfillmentStatus ${JSON.stringify(s)} unrecognized`);
        else if (VERDICTS.includes(s) && !f['fsdd:role']) out.push(`field ${f['fsdd:column']} carries verdict ${s} without a role (unwitnessed verdict)`);
      }
      return out;
    },
  },
  {
    id: 'AXIOM-9-verdict-cites-axiom',
    desc: 'A field carrying a verdict cites a present, well-formed (non-empty) deciding axiom (PRESENCE + well-formedness, NOT correctness -- a named ceiling).',
    covers: ['fsdd:hasField[].fsdd:decidingAxiom'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => VERDICTS.includes(f['fsdd:fulfillmentStatus']))
      .filter((f) => typeof f['fsdd:decidingAxiom'] !== 'string' || f['fsdd:decidingAxiom'].trim() === '')
      .map((f) => `field ${f['fsdd:column']} has verdict ${f['fsdd:fulfillmentStatus']} but no present/well-formed deciding axiom`),
  },
  {
    id: 'TAINTLVL-10-level-matches-derivation',
    desc: 'Each field taintLevel equals the level its own taintDerivation witnesses (max floor; L0->L1; +1 when proposalSource is probabilistic) -- mirrors the engine.',
    covers: ['fsdd:hasField[].fsdd:taintLevel'],
    applies: () => true,
    check: (d) => {
      const probabilistic = d['fsdd:proposalSource'] === 'probabilistic';
      const out = [];
      for (const f of fields(d)) {
        const derivs = f['fsdd:taintDerivation'] || [];
        const floors = derivs.map((s) => (s.split('->')[1] || '').trim()).filter((x) => LV.includes(x));
        const maxFloor = floors.reduce((m, x) => (LV.indexOf(x) > LV.indexOf(m) ? x : m), 'L0');
        let exp = maxFloor === 'L0' ? 'L1' : maxFloor;
        if (probabilistic && exp !== 'L5') exp = LV[Math.min(LV.indexOf(exp) + 1, 4)];
        if (f['fsdd:taintLevel'] !== exp) out.push(`field ${f['fsdd:column']} taintLevel ${f['fsdd:taintLevel']} != witnessed ${exp} (derivation ${JSON.stringify(derivs)})`);
      }
      return out;
    },
  },
  {
    id: 'ICE-11-record-not-instance',
    desc: 'Every implicit entity is an information-content record ABOUT an absent participant (concernsType + derivedFrom); it never asserts an observed instance. (Load-bearing.)',
    covers: ['fsdd:hasImplicitEntity'],
    applies: () => true,
    check: (d) => (d['fsdd:hasImplicitEntity'] || [])
      .map((ie, i) => ({ ie, i }))
      .filter(({ ie }) => !(ie['fsdd:concernsType'] && ie['fsdd:derivedFrom']) || ie['fsdd:observed'] === true || ie['fsdd:assertedInstance'] !== undefined || ie['@id'])
      .map(({ i }) => `implicit entity ${i} is not a well-formed absent-participant record (missing concernsType/derivedFrom, or asserts an observed instance)`),
  },
  {
    id: 'LAW-12-cited-law-consistent',
    desc: 'Cited law hashes are well-formed and self-consistent: every per-field adjudicatingLaw hash appears in the dataset-level adjudicatedAgainst.',
    covers: ['fsdd:adjudicatedAgainst', 'fsdd:adjudicatedAgainst[].fsdd:lawHash', 'fsdd:hasField[].fsdd:adjudicatingLaw'],
    applies: () => true,
    check: (d) => {
      const out = [];
      const dsHashes = new Set((d['fsdd:adjudicatedAgainst'] || []).map((a) => a['fsdd:lawHash']).filter(Boolean));
      for (const h of dsHashes) if (typeof h !== 'string' || !h.startsWith('sha256:')) out.push(`adjudicatedAgainst hash ${JSON.stringify(h)} not well-formed`);
      const fieldHashes = new Set(fields(d).map((f) => f['fsdd:adjudicatingLaw'] && f['fsdd:adjudicatingLaw']['fsdd:lawHash']).filter(Boolean));
      for (const h of fieldHashes) if (!dsHashes.has(h)) out.push(`field law ${h} absent from adjudicatedAgainst (inconsistent law citation)`);
      return out;
    },
  },
  {
    id: 'PROPSRC-13-recognized',
    desc: 'proposalSource is recognized (deterministic | probabilistic). It feeds the taint derivation, so a garbage value would corrupt that witness. (Stronger form -- consistency with the taint bump -- is a named ceiling.)',
    covers: ['fsdd:proposalSource'],
    applies: () => true,
    check: (d) => (['deterministic', 'probabilistic', undefined].includes(d['fsdd:proposalSource'])
      ? [] : [`proposalSource ${JSON.stringify(d['fsdd:proposalSource'])} unrecognized -- would corrupt the taint derivation it feeds`]),
  },
  {
    id: 'REVIEW-14-flag-taint-consistent',
    desc: 'requiresReview is taint-constrained: a field flagged for review carries a binder review entry in its taint derivation and a level >= L3.',
    covers: ['fsdd:hasField[].fsdd:requiresReview'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => f['fsdd:requiresReview'] === true)
      .filter((f) => !((f['fsdd:taintDerivation'] || []).some((s) => /^binder:/.test(s)) && ['L3', 'L4', 'L5'].includes(f['fsdd:taintLevel'])))
      .map((f) => `field ${f['fsdd:column']} requiresReview=true but no binder review taint (level ${f['fsdd:taintLevel']}) -- unwitnessed review flag`),
  },
];

// EXEMPT (reasoned): NOT truth-claims the FSDD originates. Each entry names WHY -- 'structural' (JSON-LD
// framing / containers), 'echo' (verbatim pass-through of upstream input), 'sub-structure' (a member of a
// witnessed container). The engine refuses an exempt without a recognized reason (G-2): you cannot exempt an
// assertion silently; you must say why it is not a truth-claim.
const EXEMPT = [
  { path: '@context', reason: 'structural' },
  { path: '@type', reason: 'structural' },
  { path: 'dcterms:title', reason: 'echo' },
  { path: 'prov:wasAttributedTo', reason: 'echo' },
  { path: 'fsdd:hasField', reason: 'structural' },
  { path: 'fsdd:rawInputHash', reason: 'echo' },
  { path: 'fsdd:adjudicatedAgainst[].diagnostic', reason: 'sub-structure' },
  { path: 'fsdd:adjudicatedAgainst[].ref', reason: 'sub-structure' },
  { path: 'fsdd:hasField[].@type', reason: 'structural' },
  { path: 'fsdd:hasField[].fsdd:column', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:typeDistribution', reason: 'echo' },
  { path: 'fsdd:hasField[].csvw:datatype', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:nullable', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:semanticType', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:consensus', reason: 'echo' },
  { path: 'fsdd:hasField[].sas:alignmentRule', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:fillerKind', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:convergence', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:confidence', reason: 'echo' },
  { path: 'fsdd:hasField[].fsdd:necessity', reason: 'echo' },
];

// The FSDD artifact-law. WITNESS-DEFERRED (third bucket) is empty: the ledger covers its artifact.
export const FSDD_LEDGER = { claims: CLAIMS, exempt: EXEMPT, deferred: [] };
