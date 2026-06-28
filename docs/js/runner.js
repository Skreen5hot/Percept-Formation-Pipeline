import { normalize } from './snp.js';
import { infer as bibssInfer } from './bibss.js';
import { alignSchema } from './sas.js';
import { bindSchema } from './binder.js';
import { adjudicateProposal } from './oce.js';
import { buildDictionary } from './fsdd.js';
import { init as fandawsInit, bindRows } from './fandaws.js';
import { resolveStar, wrapForFsddPanel, STAR_NORTHWIND } from './ssm.js';
import { materializeStar, materializeStarSnowflake, materializeRawForFront } from './gm.js';

export async function run(rawInput, callbacks = {}) {
  const { onStageStart, onStageDone } = callbacks;
  const stages = {};
  let lastBuiltStageReached = null;
  const inputMode = 'raw';

  function setGates() {
    stages.dknp = { status: 'gate', gateReason: 'DKNP not yet implemented' };
  }

  onStageStart?.('snp');
  let snpResult;
  try {
    snpResult = normalize(rawInput);
  } catch (err) {
    stages.snp = { status: 'stopped', stopReason: `SNP: ${err.message}` };
    onStageDone?.('snp', stages.snp);
    setGates();
    return { stages, inputMode, lastBuiltStageReached };
  }

  if (!snpResult.cleaned || snpResult.displayRecords.length === 0) {
    stages.snp = { status: 'stopped', stopReason: 'SNP: zero records after cleaning' };
    onStageDone?.('snp', stages.snp);
    setGates();
    return { stages, inputMode, lastBuiltStageReached };
  }

  stages.snp = { status: 'done', ...snpResult };
  onStageDone?.('snp', stages.snp);
  lastBuiltStageReached = 'snp';

  onStageStart?.('bibss');
  const { cleaned, displayRecords } = snpResult;
  const bibssResult = bibssInfer(cleaned);

  if (!bibssResult.flatNodes || bibssResult.flatNodes.length === 0) {
    stages.bibss = { status: 'stopped', stopReason: 'BIBSS: zero nodes inferred' };
    onStageDone?.('bibss', stages.bibss);
    setGates();
    return { stages, inputMode, lastBuiltStageReached };
  }

  stages.bibss = { status: 'done', ...bibssResult };
  onStageDone?.('bibss', stages.bibss);
  lastBuiltStageReached = 'bibss';

  onStageStart?.('sas');
  const sasResult = alignSchema(bibssResult, displayRecords.length);
  if (sasResult.status !== 'ok' || !sasResult.schema) {
    const code = (sasResult.diagnostics && sasResult.diagnostics[0] && sasResult.diagnostics[0].code) || 'no schema';
    stages.sas = { status: 'stopped', stopReason: `SAS: ${code}` };
    onStageDone?.('sas', stages.sas);
    setGates();
    return { stages, inputMode, lastBuiltStageReached };
  }
  stages.sas = { status: 'done', schema: sasResult.schema, diagnostics: sasResult.diagnostics };
  onStageDone?.('sas', stages.sas);
  lastBuiltStageReached = 'sas';

  // Binder always runs (it never throws); declining with no frame is a valid, faithful outcome.
  onStageStart?.('binder');
  const binderResult = bindSchema(sasResult.schema);
  stages.binder = { status: 'done', proposal: binderResult };
  onStageDone?.('binder', stages.binder);
  lastBuiltStageReached = 'binder';

  // OCE adjudicates the Binder's proposal against the constitutive law. If the Binder DECLINED (no
  // proposal), there is nothing to adjudicate -- shown honestly as a gate, not a fabricated verdict.
  if (binderResult['bind:proposals'] && binderResult['bind:proposals'].length) {
    onStageStart?.('oce');
    const judgment = adjudicateProposal(binderResult);
    stages.oce = { status: 'done', judgment };
    onStageDone?.('oce', stages.oce);
    lastBuiltStageReached = 'oce';
  } else {
    stages.oce = { status: 'gate', gateReason: 'Not reached -- the Binder declined; no proposal to adjudicate.' };
    onStageDone?.('oce', stages.oce);
  }

  onStageStart?.('fandaws');
  await fandawsInit();
  const fandawsResult = bindRows(displayRecords);   // per-row binding on the primary label field
  stages.fandaws = { status: 'done', binding: fandawsResult };
  onStageDone?.('fandaws', stages.fandaws);
  lastBuiltStageReached = 'fandaws';

  // The PRODUCT: emit the Semantic Data Dictionary from the live stage outputs (composition in the open).
  // On a Binder decline (no adjudication) it degrades to a standards-pure structural+semantic dictionary.
  onStageStart?.('fsdd');
  const fsddResult = buildDictionary(stages);
  stages.fsdd = { status: (fsddResult && fsddResult.ok) ? 'done' : 'stopped', result: fsddResult };
  onStageDone?.('fsdd', stages.fsdd);

  // TRANSFORM/LOAD (raw front): project the Adjudication Manifest into a faithful RDF graph -- one blank-node frame
  // per row. Runs only when a frame was bound (declined -> nothing to materialize) and not disputed (deferred).
  onStageStart?.('gm');
  const rawProps = (stages.binder.proposal && stages.binder.proposal['bind:proposals']) || [];
  const rawRC = rawProps.length ? rawProps[0]['bind:proposedBinding'].recordConcept : null;
  const rawStatus = fsddResult && fsddResult.ok && fsddResult.dictionary && fsddResult.dictionary['fsdd:datasetStatus'];
  if (rawRC && fsddResult.ok && rawStatus !== 'disputed') {
    const graph = materializeRawForFront(fsddResult.dictionary, displayRecords, rawRC);
    stages.gm = { status: 'done', raw: true, triples: graph.triples, turtle: graph.turtle, frameCount: graph.frameCount, datasetStatus: graph.datasetStatus, recordConcept: rawRC };
  } else {
    stages.gm = { status: 'gate', gateReason: rawRC ? 'disputed -- multi-frame materialization deferred (increment 2)' : 'no frame bound -- nothing to materialize' };
  }
  onStageDone?.('gm', stages.gm);

  setGates();

  return { stages, inputMode, lastBuiltStageReached };
}

// runStar -- the STRUCTURED-SOURCE FRONT, parallel to run() (the raw-text front). Same callback interface, so
// the UI renders it through the same stage panels. The star path resolves FKs + binds roles (the SSM front),
// then the resulting flat ActOfOrdering frame is adjudicated by the SAME shared Binder->OCE->FSDD core. The
// existing run() path is untouched -- this is additive (extend, don't replace). integrate() (vendor/ssm) is
// the proven orchestrator (capstone smoke 6/6); runStar PRESENTS its decision per stage, never re-derives it.
export async function runStar(factRows, callbacks = {}) {
  const { onStageStart, onStageDone } = callbacks;
  const stages = {};
  const inputMode = 'star';

  const mapping = STAR_NORTHWIND.ssm;
  const factSpec = mapping['ssm:facts'][Object.keys(mapping['ssm:facts'])[0]];
  const RA = factSpec['ssm:roleAssignments'] || [];
  const dims = mapping['ssm:dimensions'] || {};
  const recordConcept = factSpec['ssm:recordConcept'];

  // SSM FRONT: resolve FKs + bind roles. integrate() composes the SHARED vendor/{oce,fsdd,binder}.
  onStageStart?.('ssm');
  const resolved = resolveStar(factRows);
  const row = (resolved.results || [])[0] || null;
  const factRow = factRows[0] || {};

  const defectFieldId = row && row.defect && row.defect.diagnostic && row.defect.diagnostic.fieldId;
  const roleDefectRoles = new Set(((row && row.roleDefects) || []).map((d) => String(d.role)));
  const roleResolutions = RA.map((ra) => {
    const fkVal = factRow[ra['ssm:fkColumn']];
    let note;
    if (fkVal === null || fkVal === undefined) note = 'null';
    else if (ra['ssm:fkColumn'] === defectFieldId) note = 'dangling -> frame excluded';
    else if (roleDefectRoles.has(String(ra['ssm:role']))) note = 'dangling (accidental) -> roleDefect';
    else note = 'resolved';
    return {
      fkColumn: ra['ssm:fkColumn'], role: ra['ssm:role'], refTable: ra['ssm:refTable'],
      relatumConcept: (dims[ra['ssm:refTable']] || {})['ssm:entityClass'], fkValue: fkVal, note,
    };
  });
  stages.ssm = {
    status: row ? 'done' : 'stopped', recordConcept, roleResolutions,
    outcome: row && row.outcome, roleDefects: (row && row.roleDefects) || [], capMarkers: (row && row.capMarkers) || [],
  };
  onStageDone?.('ssm', stages.ssm);

  const excluded = !row || row.outcome === 'dangling' || row.outcome === 'fails' || !row.dictionary;

  // CONVERGENCE: the resolved roles become a flat frame proposal handed to the SHARED Binder.
  onStageStart?.('binder');
  if (excluded) {
    stages.binder = { status: 'gate', gateReason: 'Frame excluded at the SSM front (constitutive dangling); no proposal to adjudicate.' };
  } else {
    const roleBindings = roleResolutions
      .filter((r) => r.note === 'resolved' || r.note === 'dangling (accidental) -> roleDefect')
      .map((r) => ({ role: r.role, relatumConcept: r.relatumConcept, fieldId: 'viz:field/' + r.fkColumn }));
    stages.binder = { status: 'done', shared: true, proposal: { recordConcept, roleBindings } };
  }
  onStageDone?.('binder', stages.binder);

  // SHARED OCE core verdict (the per-role justification is carried in the manifest's fsdd:hasField).
  onStageStart?.('oce');
  if (excluded) {
    stages.oce = { status: 'gate', gateReason: 'Not reached -- the frame was excluded at the SSM front.' };
  } else {
    const status = row.dictionary['fsdd:datasetStatus'];
    const verdict = status === 'succeeds'
      ? 'SUCCEEDS'
      : (row.outcome === 'absent' ? 'INCOMPLETE (a constitutive role is empty -> ICE)' : String(status || 'unadjudicated').toUpperCase());
    stages.oce = { status: 'done', shared: true, verdict, datasetStatus: status, outcome: row.outcome };
  }
  onStageDone?.('oce', stages.oce);

  // PRODUCT: the same FSDD manifest, via the same emit() bytes (wrapped for the existing FSDD panel).
  onStageStart?.('fsdd');
  stages.fsdd = { status: (row && row.dictionary) ? 'done' : 'stopped', result: wrapForFsddPanel(row) };
  onStageDone?.('fsdd', stages.fsdd);

  // TRANSFORM/LOAD: project the IntegrateResult into a faithful RDF graph (the GM front, downstream of FSDD).
  // M reads result.outcome and projects per the four-outcome partition; it never re-derives the SSM decision.
  // SNOWFLAKE: after the star roles materialize, descend any resolved relatum whose dimension declares its own
  // FKs (ship_info -> customer_dim) one declared level further. The star triples are unchanged (S4 byte-stable);
  // the hop edges are appended + exact-duplicate-deduped (the structured front's resolution made graph-capable).
  onStageStart?.('gm');
  const graph = materializeStarSnowflake(resolved, factRows);
  stages.gm = { status: 'done', triples: graph.triples, turtle: graph.turtle, perRow: graph.perRow, hopTriples: graph.hopTriples };
  onStageDone?.('gm', stages.gm);

  return { stages, inputMode, resolved };
}
