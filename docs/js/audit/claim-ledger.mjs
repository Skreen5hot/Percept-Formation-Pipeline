// THE CLAIM-LEDGER for the FSDD manifest -- instance 1 of the Auditor capability. The Auditor is the OCE's
// stance turned reflexive: where the OCE adjudicates whether a binding's claims are witnessed by a law, the
// Auditor adjudicates whether a FACTORY-EMITTED artifact's claims are witnessed by what actually ran. An
// unwitnessed claim is a violation (the OCE refuses rather than guesses; so does this).
//
// HUMAN-RATIFIED GROUND TRUTH (Aaron, 2026-06-25). The gate is only as honest as this ledger.
//
// THREE CAPABILITY contracts every ledger inherits (not PFP-specific):
//   CAP-A (witnessed exceptions): any claim permitting an exception must require it witnessed by an artifact
//          the engine can CHECK -- never self-granted. (Instantiated by TAINT-3's witnessed-dispute carve-out.)
//   CAP-B (completeness is a finding): every artifact assertion is WITNESSED (a claim), EXEMPT (structural/
//          echo), or WITNESS-DEFERRED (a known truth-claim not yet witnessed -- DISCLOSED, never absorbed into
//          exempt). Anything in none of the three is a finding. "audit: success" = "nothing unwitnessed".
//   The THIRD BUCKET (witness-deferred) makes a known-but-unwitnessed truth-claim VISIBLE rather than hidden
//          in exempt -- absorbing it into exempt is the exact failure CAP-B exists to catch. The gate
//          default-denies on uncovered OR witness-deferred being non-empty (deferred disclosed).
//
// Audit context: { sourceKind: 'structured' | 'raw', expectedRoles?: string[] }
import { dictionaryHash } from '../vendor/fsdd/src/jcs.mjs';

const SOURCE_PREFIX = /^(structured-source|bibss|sas|binder|oce):/;
const RAW_STAGE_PREFIX = /^(bibss|sas):/;
const fields = (d) => d['fsdd:hasField'] || [];
const LV = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const VERDICTS = ['fulfilled', 'violated', 'empty'];

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
    desc: 'Every field taint derivation names a recognized provenance source.',
    covers: ['fsdd:hasField[].fsdd:taintDerivation'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => (f['fsdd:taintDerivation'] || []).some((s) => !SOURCE_PREFIX.test(s)))
      .map((f) => `field ${f['fsdd:column']} taint derivation ${JSON.stringify(f['fsdd:taintDerivation'])} has an unrecognized provenance source`),
  },
  {
    id: 'TAINT-3-dataset-witnessed',
    desc: 'datasetTaint equals the max field taint -- and may diverge to L4 ONLY on a WITNESSED dispute, never a self-asserted flag (CAP-A).',
    covers: ['fsdd:datasetTaint', 'fsdd:disputed'],
    applies: () => true,
    check: (d) => {
      const maxField = fields(d).reduce((m, f) => (LV.indexOf(f['fsdd:taintLevel'] || 'L0') > LV.indexOf(m) ? (f['fsdd:taintLevel'] || 'L0') : m), 'L0');
      const ds = d['fsdd:datasetTaint'];
      if (ds === maxField) return [];
      const disputed = d['fsdd:disputed'] || [];
      const witnessedDispute = d['fsdd:datasetStatus'] === 'disputed'
        && disputed.length >= 1
        && disputed.every((x) => Array.isArray(x['fsdd:candidates']) && x['fsdd:candidates'].length >= 2);
      if (ds === 'L4' && witnessedDispute) return [];
      return [`datasetTaint ${ds} != max field taint ${maxField} with no witnessed dispute (status 'disputed' + >=2 candidates) -- unwitnessed or self-granted`];
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
    // PRESENCE, never ADEQUACY (ratified). Refuses a role-bearing field whose grounded concept is structurally
    // absent; does NOT judge whether the concept is the correct one (a named ceiling -- the semantic tier).
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
    // LOAD-BEARING. The content hash is the strongest witness in the ledger: it is fully self-checkable, so
    // tampering ANY content (incl. a claim's own subject) changes the hash and is caught.
    desc: 'dictionaryVersion is the self-verifying content hash: re-canonicalizing the dictionary (excluding the version key) reproduces it.',
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
    // PRESENCE-AND-WELL-FORMEDNESS (ratified), NOT correctness-of-choice. A verdict must cite a non-empty
    // deciding axiom; whether that axiom is the RIGHT one is a named ceiling (the semantic tier).
    desc: 'A field carrying a verdict cites a present, well-formed (non-empty) deciding axiom (not whether the axiom is correct -- a ceiling).',
    covers: ['fsdd:hasField[].fsdd:decidingAxiom'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => VERDICTS.includes(f['fsdd:fulfillmentStatus']))
      .filter((f) => typeof f['fsdd:decidingAxiom'] !== 'string' || f['fsdd:decidingAxiom'].trim() === '')
      .map((f) => `field ${f['fsdd:column']} has verdict ${f['fsdd:fulfillmentStatus']} but no present/well-formed deciding axiom`),
  },
  {
    id: 'TAINTLVL-10-level-matches-derivation',
    desc: 'Each field taintLevel equals the level its own taintDerivation witnesses (max floor; L0->L1; +1 when proposalSource is probabilistic) -- mirrors the engine, never asserted independently.',
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
    // LOAD-BEARING. The FSDD's core honesty: an unwitnessed participant becomes a RECORD ABOUT an absent thing,
    // never a fabricated observed instance. This claim refuses any implicit entity that crosses that line.
    desc: 'Every implicit entity is an information-content record ABOUT an absent participant (concernsType + derivedFrom); it never asserts an observed instance.',
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
    desc: 'requiresReview is taint-constrained: a field flagged for review carries a binder review entry in its taint derivation and a level >= L3 (the flag cannot claim review without the taint that witnesses it).',
    covers: ['fsdd:hasField[].fsdd:requiresReview'],
    applies: () => true,
    check: (d) => fields(d)
      .filter((f) => f['fsdd:requiresReview'] === true)
      .filter((f) => !((f['fsdd:taintDerivation'] || []).some((s) => /^binder:/.test(s)) && ['L3', 'L4', 'L5'].includes(f['fsdd:taintLevel'])))
      .map((f) => `field ${f['fsdd:column']} requiresReview=true but no binder review taint (level ${f['fsdd:taintLevel']}) -- unwitnessed review flag`),
  },
];

// EXEMPT -- NOT truth-claims the FSDD originates: structural framing, sub-structure of a witnessed container,
// or verbatim echoes of upstream inputs. CAP-B requires every assertion to be witnessed, exempt, or
// witness-deferred; the author consciously classifies each -- an unclassified property is the silent omission.
export const FSDD_EXEMPT = [
  '@context', '@type', 'dcterms:title', 'prov:wasAttributedTo',
  'fsdd:hasField',                                  // structural container (members classified individually)
  'fsdd:rawInputHash',                              // verbatim echo of schema viz:rawInputHash
  'fsdd:adjudicatedAgainst[].diagnostic', 'fsdd:adjudicatedAgainst[].ref',  // sub-structure under LAW-12
  'fsdd:hasField[].@type', 'fsdd:hasField[].fsdd:column',
  'fsdd:hasField[].fsdd:typeDistribution',          // echo of cism
  'fsdd:hasField[].csvw:datatype', 'fsdd:hasField[].fsdd:nullable',
  'fsdd:hasField[].fsdd:semanticType', 'fsdd:hasField[].fsdd:consensus', 'fsdd:hasField[].sas:alignmentRule',
  'fsdd:hasField[].fsdd:fillerKind', 'fsdd:hasField[].fsdd:convergence', 'fsdd:hasField[].fsdd:confidence',
  'fsdd:hasField[].fsdd:necessity',                 // the law's relation name (label/echo, not an FSDD-originated claim)
];

// WITNESS-DEFERRED -- known truth-claims not yet witnessed. The THIRD BUCKET: DISCLOSED, never folded into
// exempt. Empty here (the FSDD ledger covers its artifact). A non-empty entry BLOCKS the publication gate
// (default-deny) while remaining visible -- the honest alternative to silently exempting an unwitnessed claim.
export const FSDD_DEFERRED = [];
