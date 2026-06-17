import {
  semanticTypeLocalName,
  normalizeHash,
  datatypeFor,
  convergence as renderConvergence,
  typeDistributionVerbatim,
  roleVerbatim,
  axiomVerbatim,
  groundingToCsvw,
} from './render.mjs';
import { fieldTaint } from './taint.mjs';
import { lawReference } from './lawRef.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function buildField(record, lawRegistry, config = {}) {
  const diagnostics = [];

  const structuralType = record.sasField && record.sasField['sas:structuralType'];
  const typeDistribution = record.cismField && record.cismField.typeDistribution;
  const nullable = record.cismField && record.cismField.nullable;
  const semanticTypeSrc = record.sasField && record.sasField['viz:hasDataType'];
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

  const field = { '@type': 'fsdd:DataField' };
  field['fsdd:column'] = record.column;

  const datatype = datatypeFor(structuralType);
  if (datatype != null) {
    field['csvw:datatype'] = datatype;
  } else if (structuralType) {
    diagnostics.push(makeDiagnostic('FSDD-011', { column: record.column, structuralType }));
  }

  if (typeDistribution != null) {
    field['fsdd:typeDistribution'] = typeDistributionVerbatim(typeDistribution);
  }

  if (nullable != null) {
    field['fsdd:nullable'] = nullable;
  }

  if (semanticTypeSrc != null) {
    field['fsdd:semanticType'] = semanticTypeLocalName(semanticTypeSrc);
  }

  if (consensus != null) {
    field['fsdd:consensus'] = consensus;
  }

  if (alignmentRule != null) {
    field['sas:alignmentRule'] = alignmentRule;
  }

  if (relatumConcept) {
    const groundedConcept = { '@id': relatumConcept, 'fsdd:via': 'fandaws' };
    const csvwGrounding = groundingToCsvw(relatumConcept);
    if (csvwGrounding) Object.assign(groundedConcept, csvwGrounding);
    field['fsdd:groundedConcept'] = groundedConcept;
  }

  if (role != null) {
    field['fsdd:role'] = roleVerbatim(role);
  }

  const necessityRole = record.necessity && record.necessity['oce:relation'];
  if (necessityRole != null) {
    field['fsdd:necessity'] = roleVerbatim(necessityRole);
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

  if (record.requiresReview != null) {
    field['fsdd:requiresReview'] = record.requiresReview;
  }

  field['fsdd:fulfillmentStatus'] = status != null ? status : 'n/a';

  if (axiom != null) {
    field['fsdd:decidingAxiom'] = axiomVerbatim(axiom);
  }

  if (lawHash != null) {
    const fromRef = lawReference(lawHash, lawRegistry);
    if (fromRef != null && fromRef['fsdd:lawHash'] != null) {
      field['fsdd:adjudicatingLaw'] = fromRef;
    } else {
      const normalizedHash = normalizeHash(lawHash);
      const entry = lawRegistry &&
        (lawRegistry[lawHash] ||
          (normalizedHash != null && lawRegistry[normalizedHash]));
      const lawObj = { 'fsdd:lawHash': normalizedHash };
      if (entry) {
        if (entry.lawIRI != null) lawObj['fsdd:lawIRI'] = entry.lawIRI;
        if (entry.lawTitle != null) lawObj['fsdd:lawTitle'] = entry.lawTitle;
        if (entry.lawVersion != null) lawObj['fsdd:lawVersion'] = entry.lawVersion;
        if (entry.lawPublished != null) lawObj['fsdd:lawPublished'] = entry.lawPublished;
      } else {
        diagnostics.push(makeDiagnostic('FSDD-010', { lawHash }));
      }
      field['fsdd:adjudicatingLaw'] = lawObj;
    }
  }

  const activeTypeKeys = typeDistribution
    ? Object.keys(typeDistribution).filter(k => typeDistribution[k] != null && typeDistribution[k] > 0)
    : [];
  const bibss = record.cismField
    ? { floor: activeTypeKeys.length === 1 ? 'L1' : 'L2', why: 'distribution' }
    : null;

  const semanticTypeStr = semanticTypeSrc ? semanticTypeLocalName(semanticTypeSrc) : null;
  const sas = record.sasField
    ? (consensus === '1.000000'
        ? { floor: 'L1', why: 'consensus 1.0' }
        : (semanticTypeStr === 'Unknown' || alignmentRule === 'unknown-assignment')
            ? { floor: 'L4', why: 'unknown' }
            : { floor: 'L2', why: 'consensus<1' })
    : null;

  const binder = record.requiresReview ? { floor: 'L3', why: 'requiresReview' } : null;
  const oce = status === 'violated' ? { floor: 'L5', why: 'violated' } : null;

  const taintResult = fieldTaint(
    { bibss, sas, binder, oce },
    { probabilisticBump: !!config.probabilisticTaintBump }
  );
  field['fsdd:taintLevel'] = taintResult.level;
  field['fsdd:taintDerivation'] = taintResult.derivation;

  if (status === 'violated') {
    diagnostics.push(makeDiagnostic('FSDD-003', { field: record.column, axiom }));
  }

  return { field, diagnostics };
}
