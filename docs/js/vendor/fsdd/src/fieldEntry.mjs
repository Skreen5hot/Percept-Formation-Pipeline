import {
  semanticTypeLocalName,
  normalizeHash,
  datatypeFor,
  convergence as renderConvergence,
  consensusVerbatim,
  typeDistributionVerbatim,
  roleVerbatim,
  axiomVerbatim,
  groundingToCsvw
} from './render.mjs';
import { fieldTaint } from './taint.mjs';
import { lawReference } from './lawRef.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function buildField(record, lawRegistry, config = {}) {
  const diagnostics = [];

  const structuralType = record.sasField && record.sasField['sas:structuralType'];
  const typeDistribution = record.cismField && record.cismField.typeDistribution;
  const nullable = record.cismField && record.cismField.nullable;
  const semanticTypeSource = record.sasField && record.sasField['viz:hasDataType'];
  const consensus = record.sasField && record.sasField['viz:consensusScore'];
  const alignmentRule = record.sasField && record.sasField['sas:alignmentRule'];
  const role =
    (record.bindingEvidence && record.bindingEvidence['bind:role']) ||
    (record.necessity && record.necessity['oce:relation']);
  const relatumConcept = record.bindingEvidence && record.bindingEvidence['bind:relatumConcept'];
  const fillerKind = record.bindingEvidence && record.bindingEvidence['bind:fillerKind'];
  const convergenceInput = record.bindingEvidence && record.bindingEvidence['bind:convergence'];
  const confidence = record.bindingEvidence && record.bindingEvidence['bind:bindingConfidence'];
  const status = record.necessity && record.necessity['oce:status'];
  const axiom = record.necessity && record.necessity['oce:evidence'];
  const lawHash = record.lawHash;

  const semanticType = semanticTypeSource ? semanticTypeLocalName(semanticTypeSource) : null;

  let bibss = null;
  if (record.cismField) {
    const dist = typeDistribution || {};
    const activeKeys = Object.keys(dist).filter(k => dist[k] > 0);
    bibss = { floor: activeKeys.length === 1 ? 'L1' : 'L2', why: 'distribution' };
  }

  let sas = null;
  if (record.sasField) {
    if (consensus === '1.000000') {
      sas = { floor: 'L1', why: 'consensus 1.0' };
    } else if (semanticType === 'Unknown' || alignmentRule === 'unknown-assignment') {
      sas = { floor: 'L4', why: 'unknown' };
    } else {
      sas = { floor: 'L2', why: 'consensus<1' };
    }
  }

  const binder = record.requiresReview ? { floor: 'L3', why: 'requiresReview' } : null;
  const oce = status === 'violated' ? { floor: 'L5', why: 'violated' } : null;

  const taintResult = fieldTaint(
    { bibss, sas, binder, oce },
    { probabilisticBump: !!config.probabilisticTaintBump }
  );

  const field = {
    '@type': 'fsdd:DataField',
    'fsdd:column': record.column
  };

  const datatype = datatypeFor(structuralType);
  if (datatype != null) {
    field['csvw:datatype'] = datatype;
  } else {
    diagnostics.push(makeDiagnostic('FSDD-011', { column: record.column, structuralType }));
  }

  if (typeDistribution != null) {
    field['fsdd:typeDistribution'] = typeDistributionVerbatim(typeDistribution);
  }

  if (record.cismField != null) {
    field['fsdd:nullable'] = nullable;
  }

  if (semanticType != null) {
    field['fsdd:semanticType'] = semanticType;
  }

  if (consensus != null) {
    field['fsdd:consensus'] = consensusVerbatim(consensus);
  }

  if (alignmentRule != null) {
    field['sas:alignmentRule'] = alignmentRule;
  }

  if (relatumConcept) {
    const gc = { '@id': relatumConcept, 'fsdd:via': 'fandaws' };
    const csvwGround = groundingToCsvw(relatumConcept);
    if (csvwGround) Object.assign(gc, csvwGround);
    field['fsdd:groundedConcept'] = gc;
  }

  if (role != null) {
    field['fsdd:role'] = roleVerbatim(role);
  }

  if (fillerKind != null) {
    field['fsdd:fillerKind'] = fillerKind;
  }

  if (convergenceInput != null) {
    field['fsdd:convergence'] = renderConvergence(convergenceInput);
  }

  if (confidence != null) {
    field['fsdd:confidence'] = confidence;
  }

  field['fsdd:requiresReview'] = record.requiresReview;

  const necessityRole = record.necessity && record.necessity['oce:relation'];
  if (necessityRole != null) {
    field['fsdd:necessity'] = roleVerbatim(necessityRole);
  }

  field['fsdd:fulfillmentStatus'] = status != null ? status : 'n/a';

  if (axiom != null) {
    field['fsdd:decidingAxiom'] = axiomVerbatim(axiom);
  }

  if (lawHash != null) {
    const normHash = normalizeHash(lawHash);
    const entry = lawRegistry ? lawRegistry[lawHash] : null;
    const refResult = lawReference(lawHash, lawRegistry) || {};
    const lawRef = Object.assign(
      { 'fsdd:lawHash': normHash },
      entry ? {
        'fsdd:lawIRI': entry.lawIRI,
        'fsdd:lawTitle': entry.lawTitle,
        'fsdd:lawVersion': entry.lawVersion,
        'fsdd:lawPublished': entry.lawPublished,
      } : {},
      refResult
    );
    lawRef['fsdd:lawHash'] = normHash;
    field['fsdd:adjudicatingLaw'] = lawRef;
    if (!lawRef['fsdd:lawTitle']) {
      diagnostics.push(makeDiagnostic('FSDD-010', { lawHash }));
    }
  }

  field['fsdd:taintLevel'] = taintResult.level;
  field['fsdd:taintDerivation'] = taintResult.derivation;

  if (status === 'violated') {
    diagnostics.push(makeDiagnostic('FSDD-003', { field, axiom }));
  }

  return { field, diagnostics };
}
