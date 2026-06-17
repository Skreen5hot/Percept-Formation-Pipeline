import { mergeConfig } from './config.mjs';
import { structuralErrors } from './validate.mjs';
import { joinFields, emptyNecessities, selectedProposal } from './join.mjs';
import { buildField } from './fieldEntry.mjs';
import { implicitEntities } from './implicitEntity.mjs';
import { disputes } from './dispute.mjs';
import { stripToStandards } from './standardsPure.mjs';
import { dictionaryHash } from './jcs.mjs';
import { makeDiagnostic } from './diagnostics.mjs';
import { lawReference } from './lawRef.mjs';
import { maxLevel } from './taint.mjs';

const CONTEXT = {
  "fsdd": "https://fsdd.fnsr.dev/vocab#",
  "dcterms": "http://purl.org/dc/terms/",
  "csvw": "http://www.w3.org/ns/csvw#",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "qudt": "http://qudt.org/schema/qudt/",
  "prov": "http://www.w3.org/ns/prov#",
  "sas": "https://sas.fnsr.dev/vocab#",
  "viz": "https://viz.fnsr.dev/vocab#",
  "iao": "http://purl.obolibrary.org/obo/IAO_",
  "fan": "https://fan.fnsr.dev/vocab#",
  "bfo": "http://purl.obolibrary.org/obo/BFO_",
  "bind": "https://bind.fnsr.dev/vocab#",
  "oce": "https://oce.fnsr.dev/vocab#"
};

export function emit(input) {
  try {
    const cfg = mergeConfig(input?.config);

    const errs = structuralErrors(input);
    if (errs.length) return { ok: false, errors: errs };

    const diagnostics = [];
    if (!input.binding || !input.judgment) {
      diagnostics.push(makeDiagnostic('FSDD-001', {
        message: 'adjudication inputs absent; standards-pure structural+semantic dictionary'
      }));
    }

    const lawRegistry = input.envelope?.lawRegistry;
    const lawHash = input.judgment?.['oce:lawHash'];

    const proposal = selectedProposal(input);
    const requiresReview = proposal?.['bind:requiresReview'] ?? false;
    const records = joinFields(input);
    const fields = [];
    for (const record of records) {
      const result = buildField(record, lawRegistry, { ...cfg, requiresReview });
      fields.push(result.field);
      if (result.diagnostics?.length) diagnostics.push(...result.diagnostics);
    }

    const recordConcept = proposal?.['bind:proposedBinding']?.recordConcept;
    const { records: implicit, diagnostics: implDiags } = implicitEntities(
      emptyNecessities(input), recordConcept, lawHash, lawRegistry, cfg
    );
    if (implDiags?.length) diagnostics.push(...implDiags);

    const { records: disp, diagnostics: dispDiags } = disputes(input, lawRegistry);
    if (dispDiags?.length) diagnostics.push(...dispDiags);

    if (input.binding?.['bind:proposalSource'] === 'probabilistic') {
      diagnostics.push(makeDiagnostic('FSDD-007', {}));
    }

    const datasetTaint = fields.reduce((max, f) => maxLevel(max, f['fsdd:taintLevel']), 'L0');

    const adjLawHashes = new Set();
    if (lawHash) adjLawHashes.add(lawHash);
    for (const f of fields) {
      const h = f['fsdd:adjudicatingLaw']?.['fsdd:lawHash'];
      if (h) adjLawHashes.add(h);
    }
    const adjudicatedAgainst = [...adjLawHashes]
      .map(h => lawReference(h, lawRegistry))
      .filter(Boolean);

    const dictionary = { '@context': CONTEXT, '@type': 'fsdd:SemanticDataDictionary' };

    const title = input.envelope?.['dcterms:title'];
    if (title !== undefined) dictionary['dcterms:title'] = title;

    const rawInputHash = input.schema?.['viz:rawInputHash'];
    if (rawInputHash !== undefined) dictionary['fsdd:rawInputHash'] = rawInputHash;

    const verdict = input.judgment?.['oce:verdict'];
    if (verdict !== undefined) dictionary['fsdd:datasetStatus'] = verdict;

    dictionary['fsdd:datasetTaint'] = datasetTaint;
    dictionary['fsdd:adjudicatedAgainst'] = adjudicatedAgainst;

    const proposalSource = input.binding?.['bind:proposalSource'];
    if (proposalSource !== undefined) dictionary['fsdd:proposalSource'] = proposalSource;

    dictionary['fsdd:hasField'] = fields;
    dictionary['fsdd:hasImplicitEntity'] = implicit;
    dictionary['fsdd:disputed'] = disp;

    if (input.envelope?.agent !== undefined) {
      dictionary['prov:wasAttributedTo'] = input.envelope.agent;
    }

    dictionary['fsdd:dictionaryVersion'] = 'sha256:' + dictionaryHash(dictionary);

    const result = { ok: true, dictionary, diagnostics };
    if (cfg.emitStandardsPureView) {
      result.standardsPure = stripToStandards(dictionary);
    }

    return result;
  } catch (e) {
    return { ok: false, errors: [makeDiagnostic('FSDD-000', { message: e?.message ?? String(e) })] };
  }
}
