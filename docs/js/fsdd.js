import { emit } from './vendor/fsdd/src/emit.mjs';
import { canonicalize } from './vendor/fsdd/src/jcs.mjs';
import { stripToStandards } from './vendor/fsdd/src/standardsPure.mjs';

// FSDD (FNSR Semantic Data Dictionary) demo adapter -- the pipeline's first PRODUCT. It assembles the
// FSDDInput from the LIVE stage outputs (BIBSS CISM + SAS schema + Binder proposal + OCE judgment) and
// calls emit(). This is the composition check in the open: the adapter consumes what the engines actually
// emit, end to end, not a fixture. The downloadable artifact is the CANONICAL emit() bytes (the same bytes
// whose hash is fsdd:dictionaryVersion), so a consumer can re-verify the content hash -- never a
// demo-prettified approximation.

// The Layer-0 law-metadata registry (Fandaws/W2Fuel would author this; here the demo's law entries, keyed at
// runtime by the OCE judgment's lawHash). The OCE now adjudicates against the MERGED law (both frames), so
// the judgment's lawHash is the merged hash for either frame; we pick the metadata by the adjudicated CONCEPT
// so a clinical record carries clinical provenance, not the shipping label.
const SHIPPING_LAW_META = {
  lawIRI: 'https://laws.fnsr.dev/shipping', lawTitle: 'Shipping constitutive law',
  lawVersion: '1.0.0', lawPublished: '2026-03-04' };
const CLINICAL_LAW_META = {
  lawIRI: 'https://laws.fnsr.dev/clinical-measurement', lawTitle: 'Clinical measurement constitutive law',
  lawVersion: '1.0.0', lawPublished: '2026-06-17' };
const META_BY_CONCEPT = { 'fan:ActOfShipping': SHIPPING_LAW_META, 'fan:ActOfMeasuring': CLINICAL_LAW_META };

export function buildDictionary(stages) {
  const schema = stages.sas && stages.sas.schema;
  if (!schema) return null;                                  // no SAS percept -> no dictionary
  const cism = { fields: (stages.bibss && stages.bibss.flatNodes) || [] };
  const binding = stages.binder && stages.binder.proposal;   // BindingProposal (may be a decline)
  const judgment = (stages.oce && stages.oce.status === 'done') ? stages.oce.judgment : null;

  const lawRegistry = {};
  if (judgment && judgment['oce:lawHash'])
    lawRegistry[judgment['oce:lawHash']] = META_BY_CONCEPT[judgment['oce:concept']] || SHIPPING_LAW_META;

  const input = {
    envelope: { 'dcterms:title': 'Demo dataset', rawInputHash: schema['viz:rawInputHash'], lawRegistry,
                agent: { '@id': 'hiri:agent/pfp-demo' } },
    cism, schema };
  // only attach the adjudication inputs when present (a Binder decline -> degraded standards-pure dict)
  if (binding && (binding['bind:proposals'] || []).length) input.binding = binding;
  if (judgment) input.judgment = judgment;

  const result = emit(input);
  if (result.ok) {
    // canonical bytes (the real emit dictionary, canonical key order) -- the hash-verifiable download
    result.canonical = canonicalize(result.dictionary);
    result.standardsPureCanonical = canonicalize(stripToStandards(result.dictionary));
  }
  return result;
}
