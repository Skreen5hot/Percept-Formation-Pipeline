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
import { materializeRawFront } from './vendor/gm/src/materializeRaw.mjs';
import { materializeHops } from './vendor/gm/src/materializeSnowflake.mjs';
import { traverse } from './vendor/ssm/src/snowflakeTraversal.mjs';
import { toTurtle, PREFIXES } from './vendor/gm/src/serialize.mjs';
import { STAR_NORTHWIND } from './ssm.js';
import LAW from './vendor/law/actofordering_law.mjs';

export { PREFIXES };

// RAW-front projection: the dataset-level FSDD + the instance rows + the bound recordConcept -> one blank-node frame
// per row (identity-deferred -- the raw front declares no witnessed frame key). reference fillers -> witnessed
// entities; literal fillers -> RDF literals; absent constitutive roles -> ICEs; a violated mapping -> an ExcludedFrame.
export function materializeRawForFront(dictionary, rows, recordConcept) {
  const { triples } = materializeRawFront(dictionary, rows, recordConcept);
  const frameCount = triples.filter((t) => t.p === 'rdf:type' && t.o === recordConcept).length;
  return { triples, turtle: toTurtle(triples), frameCount, datasetStatus: dictionary && dictionary['fsdd:datasetStatus'] };
}

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

// SNOWFLAKE descent (the structured front's resolution made graph-capable): after the star resolves a fact's
// roles, follow any RESOLVED relatum whose dimension declares its OWN FKs (ssm:outgoingFKs) one declared level
// further. The hop reuses the SAME witnessed-identity mint as the star (entityIRI, in materializeHops), so the
// ship-to customer corefers with the orderer BY CONSTRUCTION. The star triples are UNCHANGED; the hop triples
// are APPENDED, then EXACT-duplicate triples are collapsed (the snowflaked relatum's type triple is asserted by
// BOTH the star role-binding and the snowflake subject -- the SAME triple). Dedupe removes ONLY exact duplicates,
// so every distinct edge (incl. the snowflake hasCustomer edge) survives -- NO silent loss (the dedupe-retains-
// all-edges guarantee). The subject's concept is read from the ADJUDICATED groundedConcept (the SAME source the
// star uses, gm materialize.mjs:68), never the declared entityClass -- so the snowflake subject node is byte-
// identical to the star's even if the adjudication sub-typed it (the GM-arc correct-by-coincidence discipline).
function tripleKey(t) { return t.s + '' + t.p + '' + t.o + '' + (t.lit ? '1' : '0'); }
function dedupeTriples(triples) {
  const seen = new Set();
  const out = [];
  for (const t of triples) { const k = tripleKey(t); if (!seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}

export function materializeStarSnowflake(resolved, factRows, ssmFront = STAR_NORTHWIND) {
  const star = materializeStar(resolved, factRows);
  const ssm = ssmFront.ssm;
  const dims = ssm['ssm:dimensions'] || {};
  const dimsData = ssmFront.dimsData || {};
  const query = ssmFront.query || {};
  const factTable = Object.keys(ssm['ssm:facts'])[0];
  const RA = (ssm['ssm:facts'][factTable]['ssm:roleAssignments']) || [];
  const results = (resolved && resolved.results) || [];

  const hopTriples = [];
  results.forEach((result, i) => {
    const factRow = factRows[i] || {};
    // an excluded frame materialized NO entity to descend from
    if (!result || result.outcome === 'dangling' || result.outcome === 'fails' || !result.dictionary) return;
    for (const ra of RA) {
      const refTable = ra['ssm:refTable'];
      const dimDef = dims[refTable] || {};
      if (!Array.isArray(dimDef['ssm:outgoingFKs']) || dimDef['ssm:outgoingFKs'].length === 0) continue; // not snowflaked
      const fkValue = factRow[ra['ssm:fkColumn']];
      if (fkValue === null || fkValue === undefined) continue;                    // role absent -> no entity to descend
      const subRec = (dimsData[refTable] || []).find((c) => c.businessKey === fkValue);
      if (!subRec) continue;                                                      // role dangled -> star emitted UnresolvedRole; no entity
      // subject concept from the ADJUDICATED groundedConcept (matches the star's mint; never the declared entityClass)
      const field = (result.dictionary['fsdd:hasField'] || []).find((f) => f['fsdd:column'] === ra['ssm:fkColumn']);
      const subjectConcept = field && field['fsdd:groundedConcept'] && field['fsdd:groundedConcept']['@id'];
      if (!subjectConcept) continue;                                              // star (run above) would have thrown on a malformed dict
      const hops = traverse({ subjectRefTable: refTable, subjectRow: subRec.content || {}, mapping: ssm, dimsData, query });
      const out = materializeHops({ subjectConcept, subjectKey: fkValue, hops });
      for (const t of out.triples) hopTriples.push(t);
    }
  });

  const triples = dedupeTriples([...star.triples, ...hopTriples]);
  return { triples, turtle: toTurtle(triples), perRow: star.perRow, starTriples: star.triples, hopTriples };
}
