import { normalize } from './snp.js';
import { infer as bibssInfer } from './bibss.js';
import { init as fandawsInit, bindRows } from './fandaws.js';

export async function run(rawInput, callbacks = {}) {
  const { onStageStart, onStageDone } = callbacks;
  const stages = {};
  let lastBuiltStageReached = null;
  const inputMode = 'raw';

  function setGates() {
    stages.sas = { status: 'gate', gateReason: 'SAS not yet implemented' };
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

  onStageStart?.('fandaws');
  await fandawsInit();
  const fandawsResult = bindRows(displayRecords);   // per-row binding on the primary label field
  stages.fandaws = { status: 'done', binding: fandawsResult };
  onStageDone?.('fandaws', stages.fandaws);
  lastBuiltStageReached = 'fandaws';

  setGates();

  return { stages, inputMode, lastBuiltStageReached };
}
