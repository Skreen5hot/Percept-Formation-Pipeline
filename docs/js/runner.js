import { normalize } from './snp.js';
import { infer as bibssInfer } from './bibss.js';
import { alignSchema } from './sas.js';
import { init as fandawsInit, bindRows } from './fandaws.js';

export async function run(rawInput, callbacks = {}) {
  const { onStageStart, onStageDone } = callbacks;
  const stages = {};
  let lastBuiltStageReached = null;
  const inputMode = 'raw';

  function setGates() {
    stages.binder = { status: 'gate', gateReason: 'Binder not yet implemented' };
    stages.oce = { status: 'gate', gateReason: 'OCE gate: compiled constitutive law W2Fuel+ontology/RCR' };
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

  onStageStart?.('fandaws');
  await fandawsInit();
  const fandawsResult = bindRows(displayRecords);   // per-row binding on the primary label field
  stages.fandaws = { status: 'done', binding: fandawsResult };
  onStageDone?.('fandaws', stages.fandaws);
  lastBuiltStageReached = 'fandaws';

  setGates();

  return { stages, inputMode, lastBuiltStageReached };
}
