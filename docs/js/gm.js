// GM (Graph Materialization) demo adapter -- the PFP TRANSFORM/LOAD step (the T and L of ETL for the semantic
// layer). It projects the SSM front's IntegrateResult into a faithful RDF graph under the formally-defined
// projection M : (IntegrateResult, SSMMapping, FactRow) -> RDF (spec graph-materialization v1.5). It is DOWNSTREAM
// of the SSM front and reuses the SAME integrate() output -- nothing upstream is re-derived.
//
// The risk here is not the mechanics (the FSDD is already a graph) -- it is FAITHFULNESS. M resolves EVERY role to
// exactly one of four honest outcomes (the total partition), never papering over an honest gap to make a tidier
// graph: resolved -> a WITNESSED-IDENTITY entity node (fdata:<Concept>/<resolvedKey>, coreferent because the key is
// real); constitutive-absent -> an ImplicitEntityRecord (NEVER typed as its concernsType); accidental-broken -> an
// fsdd:UnresolvedRole (NEVER typed, NEVER dropped); frame-excluded -> an ExcludedFrame naming EVERY constitutive
// dangler. Every materialized frame carries a ProjectionRecord tying it to the source FSDD.
//
// REUSE, NOT RE-IMPLEMENT (G-VENDOR): materialize()/serialize() (vendor/gm) are the byte-identical, contained-built,
// independently-verified modules (suite 46/0; the emitted graph read as the artifact; the synthetic divergence probe).

import { materialize } from './vendor/gm/src/materialize.mjs';
import { toTurtle, PREFIXES } from './vendor/gm/src/serialize.mjs';
import { STAR_NORTHWIND } from './ssm.js';
import LAW from './vendor/law/actofordering_law.mjs';

export { PREFIXES };

// Derive M's SSMMapping shape (role -> column -> concept, + constitutive from the law's RCR) from the SAME SSM front
// star. M's live dispatch reads the IntegrateResult per outcome; the constitutive flag is for completeness checking.
function localName(s) { const x = String(s); return x.includes(':') ? x.split(':').pop() : x; }
function constitutiveSet(recordConcept) {
  const rcr = LAW.rcr && LAW.rcr[recordConcept];
  if (rcr && rcr.constitutive) return new Set(rcr.constitutive.map(localName));
  const frame = LAW.frames && LAW.frames[recordConcept];
  if (frame && frame.roles && frame.roles.some(r => typeof r.constitutive === 'boolean')) {
    return new Set(frame.roles.filter(r => r.constitutive === true).map(r => localName(r.role)));
  }
  return new Set(['hasCustomer', 'hasProduct', 'orderOccupies']); // the signed Phase-2 partition (fallback)
}
function deriveMapping() {
  const ssm = STAR_NORTHWIND.ssm;
  const factTable = Object.keys(ssm['ssm:facts'])[0];
  const spec = ssm['ssm:facts'][factTable];
  const recordConcept = spec['ssm:recordConcept'];
  const dims = ssm['ssm:dimensions'] || {};
  const constitutive = constitutiveSet(recordConcept);
  const roles = (spec['ssm:roleAssignments'] || []).map((ra) => ({
    role: ra['ssm:role'],
    column: ra['ssm:fkColumn'],
    concept: (dims[ra['ssm:refTable']] || {})['ssm:entityClass'],
    constitutive: constitutive.has(localName(ra['ssm:role'])),
  }));
  return { recordConcept, factTable, roles };
}

export const M_MAPPING = deriveMapping();

// Project one SSM front run (integrate()'s native { results: [...] }) + its fact rows into RDF.
// Returns { triples, turtle, perRow:[{row, outcome, triples}] } -- the materialized graph the panel renders and
// the download serializes. Deterministic; never re-derives the SSM decision (it reads result.outcome and projects).
export function materializeStar(resolved, factRows) {
  const results = (resolved && resolved.results) || [];
  const perRow = results.map((result, i) => {
    const out = materialize(result, M_MAPPING, factRows[i] || {});
    return { row: factRows[i] || {}, outcome: result.outcome, triples: out.triples };
  });
  const triples = perRow.flatMap((r) => r.triples);
  return { triples, turtle: toTurtle(triples), perRow };
}
