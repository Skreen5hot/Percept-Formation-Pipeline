// Build + emit the RAW-front materialized graph for the honesty-ladder raw samples (Clinical = resolved+ICE,
// Mislabeled = violated -> excluded), driving the raw pipeline directly (snp->bibss->sas->binder->oce->
// buildDictionary), then materializeRawForFront. Exports buildRawSamples() for the verifier; main() writes the
// combined Turtle to stdout for the deploy gate's real rdflib parse. (Drives directly to avoid the fandaws fetch,
// which is irrelevant to materialization and needs the browser.)
import { normalize } from '../../../snp.js';
import { infer as bibssInfer } from '../../../bibss.js';
import { alignSchema } from '../../../sas.js';
import { bindSchema } from '../../../binder.js';
import { adjudicateProposal } from '../../../oce.js';
import { buildDictionary } from '../../../fsdd.js';
import { materializeRawForFront } from '../../../gm.js';
import { CLINICAL_CSV, MISLABELED_CSV } from '../../../sample.js';
import { toTurtle } from '../src/serialize.mjs';

function rawGraph(csv) {
  const snpR = normalize(csv);
  const bibssR = bibssInfer(snpR.cleaned);
  const sasR = alignSchema(bibssR, snpR.displayRecords.length);
  const bindR = bindSchema(sasR.schema);
  const props = bindR['bind:proposals'] || [];
  const j = props.length ? adjudicateProposal(bindR) : null;
  const stages = { sas: { schema: sasR.schema }, bibss: { flatNodes: bibssR.flatNodes }, binder: { proposal: bindR }, oce: { status: j ? 'done' : 'gate', judgment: j } };
  const fsddR = buildDictionary(stages);
  const rc = props.length ? props[0]['bind:proposedBinding'].recordConcept : null;
  return materializeRawForFront(fsddR.dictionary, snpR.displayRecords, rc);
}

export function buildRawSamples() {
  return { clinical: rawGraph(CLINICAL_CSV), mislabeled: rawGraph(MISLABELED_CSV) };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('gm-raw.emit.mjs')) {
  const s = buildRawSamples();
  const all = [...s.clinical.triples, ...s.mislabeled.triples];
  process.stdout.write(toTurtle(all) + '\n');
}
