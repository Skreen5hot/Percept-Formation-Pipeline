// THE STATUS-PAGE LEDGER -- instance 2 of the Auditor capability. It audits the live demo's status manifest
// (docs/data/status.json), the source of truth the DAG badges render from. Its existence is the PROOF the
// engine generalization made CAP-A/CAP-B STRUCTURAL: this ledger INHERITS them from auditor.mjs (the reasoned-
// exempt rule, the witnessed-exception rule, CAP-B coverage) without restating any of them -- it only declares
// the artifact-specific part (what is a claim, what is exempt, and each claim's witness).
//
// Witness model (ratified): a component's STATUS is witnessed by its vendored engine's PRESENCE (Built <=>
// present; NotYetBuilt <=> absent) -- supplied to the audit as ctx.vendored (the gate reads docs/js/vendor/).
// A verified GRADE is witnessed by its DISCLOSURE (grade 'verified' <=> a present, well-formed gradeWitness
// reference; the grade-proof itself is delegated to the factory, never asserted naked). No deferred bucket --
// every status claim is witnessable in-band (presence, absence, or disclosure-of-reference).
//
// Shape: { claims, exempt:[{path, reason}], deferred:[] }. Audit context: { vendored: Set<string> }.

const comps = (m) => m.components || [];
const lc = (s) => String(s || '').toLowerCase();
const STATUSES = ['Built', 'NotYetBuilt'];
const GRADES = ['verified'];

const CLAIMS = [
  {
    id: 'SP-1-status-witnessed-by-presence',
    desc: 'Each component status is witnessed by its vendored engine: Built <=> the engine is present; NotYetBuilt <=> absent. A status with no recognized value, or that contradicts the filesystem, is a finding.',
    covers: ['components[].name', 'components[].status'],
    applies: (ctx) => ctx.vendored instanceof Set,
    check: (m, ctx) => {
      const out = [];
      for (const c of comps(m)) {
        if (!STATUSES.includes(c.status)) { out.push(`component ${c.name} has unrecognized status ${JSON.stringify(c.status)}`); continue; }
        const present = ctx.vendored.has(lc(c.name));
        if (c.status === 'Built' && !present) out.push(`component ${c.name} claims Built but no vendored engine is present (unwitnessed claim)`);
        if (c.status === 'NotYetBuilt' && present) out.push(`component ${c.name} claims NotYetBuilt but a vendored engine IS present (false absence)`);
      }
      return out;
    },
  },
  {
    id: 'SP-2-grade-witnessed-by-disclosure',
    desc: "A verified grade is witnessed by its disclosure: grade (when present) is recognized, and grade 'verified' carries a present, well-formed gradeWitness reference. A naked 'verified' (no reference) is not assertable -- the grade-proof is delegated to the factory, the disclosure is what the status page claims.",
    covers: ['components[].grade', 'components[].gradeWitness'],
    applies: () => true,
    check: (m) => {
      const out = [];
      for (const c of comps(m)) {
        if (c.grade === undefined) continue;
        if (!GRADES.includes(c.grade)) { out.push(`component ${c.name} grade ${JSON.stringify(c.grade)} unrecognized`); continue; }
        if (typeof c.gradeWitness !== 'string' || c.gradeWitness.trim().length < 8) {
          out.push(`component ${c.name} claims grade 'verified' but carries no present/well-formed gradeWitness reference -- a naked grade is not assertable`);
        }
      }
      return out;
    },
  },
  {
    id: 'SP-3-scope-witnessed',
    desc: 'An out-of-scope component has NO vendored engine -- you cannot be out of scope AND built.',
    covers: ['scope'],
    applies: (ctx) => ctx.vendored instanceof Set,
    check: (m, ctx) => (((m.scope || {}).outOfScope) || [])
      .filter((name) => ctx.vendored.has(lc(name)))
      .map((name) => `${name} is declared out of scope but a vendored engine is present (contradiction)`),
  },
];

// EXEMPT (reasoned): not truth-claims the status page originates.
const EXEMPT = [
  { path: 'phase', reason: 'echo' },          // descriptive label
  { path: 'components', reason: 'structural' }, // container; members classified individually
];

export const STATUS_LEDGER = { claims: CLAIMS, exempt: EXEMPT, deferred: [] };
