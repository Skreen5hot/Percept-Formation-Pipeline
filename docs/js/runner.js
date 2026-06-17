import { normalize } from './snp.js';
import { infer as bibssInfer } from './bibss.js';
import { alignSchema } from './sas.js';
import { bindSchema } from './binder.js';
import { adjudicateProposal } from './oce.js';
import { buildDictionary } from './fsdd.js';
import { init as fandawsInit, bindRows } from './fandaws.js';

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

  setGates();

  return { stages, inputMode, lastBuiltStageReached };
}
