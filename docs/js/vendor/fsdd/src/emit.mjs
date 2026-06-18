import { mergeConfig } from './config.mjs';
import { structuralErrors } from './validate.mjs';
import { joinFields, emptyNecessities, selectedProposal } from './join.mjs';
import { buildField } from './fieldEntry.mjs';
import { implicitEntities } from './implicitEntity.mjs';
import { disputes } from './dispute.mjs';
import { stripToStandards } from './standardsPure.mjs';
import { dictionaryHash } from './jcs.mjs';
import { makeDiagnostic } from './diagnostics.mjs';
import { maxLevel } from './taint.mjs';

const CONTEXT = {
  "fsdd": "https://fnsr.dev/fsdd#",
  "dcterms": "http://purl.org/dc/terms/",
  "prov": "http://www.w3.org/ns/prov#",
  "csvw": "http://www.w3.org/ns/csvw#",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "qudt": "http://qudt.org/schema/qudt/",
  "dcat": "http://www.w3.org/ns/dcat#",
  "viz": "https://fnsr.dev/viz#",
  "sas": "https://fnsr.dev/sas#",
  "bind": "https://fnsr.dev/bind#",
  "oce": "https://fnsr.dev/oce#",
  "fan": "https://fnsr.dev/fan#",
  "iao": "http://purl.obolibrary.org/obo/IAO_",
  "bfo": "http://purl.obolibrary.org/obo/BFO_",
  "hiri": "https://fnsr.dev/hiri#"
};

export function emit(input) {
  try {
    const cfg = mergeConfig(input?.config);

    const errs = structuralErrors(input);
    if (errs.length) {
      return { ok: false, errors: errs };
    }

    const diagnostics = [];
    if (!input.binding || !input.judgment) {
      diagnostics.push(makeDiagnostic('FSDD-001', {
        message: 'adjudication inputs absent; standards-pure structural+semantic dictionary'
      }));
    }

    const lawRegistry = input.envelope?.lawRegistry;
    const lawHash = input.judgment?.['oce:lawHash'];

    const proposal = selectedProposal(input);
    const requiresReview = proposal?.['bind:requiresReview'];
    const records = joinFields(input);
    const fields = [];
    for (const record of records) {
      record.lawHash = lawHash;
      record.requiresReview = requiresReview;
      const result = buildField(record, lawRegistry, cfg);
      fields.push(result.field);
      diagnostics.push(...(result.diagnostics ?? []));
    }

    const recordConcept = proposal?.['bind:proposedBinding']?.recordConcept;
    const { records: implicit, diagnostics: id } = implicitEntities(
      emptyNecessities(input), recordConcept, lawHash, lawRegistry, cfg
    );
    diagnostics.push(...(id ?? []));

    const { records: disp, diagnostics: dd } = disputes(input, lawRegistry);
    diagnostics.push(...(dd ?? []));

    if (input.binding?.['bind:proposalSource'] === 'probabilistic') {
      diagnostics.push(makeDiagnostic('FSDD-007', {}));
    }

    // Dataset taint: MAX over field taints; L0..L5 sort lexicographically by digit
    const taintLevel = f => f?.['fsdd:taintLevel'] ?? 'L0';
    const maxTaint = fields.reduce((m, f) => taintLevel(f) > m ? taintLevel(f) : m, 'L0');

    // Distinct law references collected from built fields (same law -> same serialization)
    const seen = new Set();
    const adjudicatedAgainst = [];
    for (const f of fields) {
      const al = f['fsdd:adjudicatingLaw'];
      if (al) {
        const key = JSON.stringify(al);
        if (!seen.has(key)) {
          seen.add(key);
          adjudicatedAgainst.push(al);
        }
      }
    }

    const dictionary = {
      '@context': CONTEXT,
      '@type': 'fsdd:SemanticDataDictionary',
      'dcterms:title': input.envelope?.['dcterms:title'],
      'fsdd:rawInputHash': input.schema?.['viz:rawInputHash'],
      ...(input.judgment?.['oce:verdict'] !== undefined
        ? { 'fsdd:datasetStatus': input.judgment['oce:verdict'] }
        : {}),
      'fsdd:datasetTaint': maxTaint,
      'fsdd:adjudicatedAgainst': adjudicatedAgainst,
      'fsdd:proposalSource': input.binding?.['bind:proposalSource'],
      'fsdd:hasField': fields,
      'fsdd:hasImplicitEntity': implicit ?? [],
      'fsdd:disputed': disp ?? [],
    };

    // DISPUTE SUPPRESSION: when the dataset is disputed (two competing readings, no winner), the REFUSAL is
    // the headline -- not a single frame's provisional verdict. datasetStatus becomes 'disputed'; taint
    // becomes L4 ("disputed between competing laws" -- the second clause of L4's definition); every field is
    // 'contested' so no row asserts a single-frame fulfillment. Bounded: fires ONLY when disputed, so the
    // non-dispute path (and its content hash) is byte-identical.
    if ((disp ?? []).length > 0) {
      dictionary['fsdd:datasetStatus'] = 'disputed';
      dictionary['fsdd:datasetTaint'] = maxLevel(maxTaint, 'L4');
      for (const f of (dictionary['fsdd:hasField'] || [])) f['fsdd:fulfillmentStatus'] = 'contested';
    }

    // prov:wasAttributedTo omitted entirely when no agent (never set to undefined)
    if (input.envelope?.agent !== undefined) {
      dictionary['prov:wasAttributedTo'] = input.envelope.agent;
    }

    // Self-excluded hash: dictionaryHash sees the doc without this key, then we insert it
    dictionary['fsdd:dictionaryVersion'] = 'sha256:' + dictionaryHash(dictionary);

    const result = { ok: true, dictionary, diagnostics };
    if (cfg.emitStandardsPureView) {
      result.standardsPure = stripToStandards(dictionary);
    }

    return result;
  } catch (e) {
    return {
      ok: false,
      errors: [makeDiagnostic('FSDD-000', { message: String(e?.message ?? e) })]
    };
  }
}
