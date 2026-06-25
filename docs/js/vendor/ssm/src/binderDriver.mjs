import { bind } from '../../binder/src/bind.mjs';
import { relatumSatisfied, frameRoleSlots } from '../../binder/src/frameLaw.mjs';
import { isFlatBindingSafe } from './fieldId.mjs';

export function binderDriver({ factBinding, factSchema, law, scope, lexis, config }) {
  const { recordConcept, roleBindings: preboundRaw } = factBinding;

  // Step 1: CONCEPT-CHECK each pre-bound roleBinding
  const slots = frameRoleSlots(law, recordConcept);
  for (const rb of preboundRaw) {
    const slot = (slots || []).find(s => s.role === rb.role);
    if (!slot || !relatumSatisfied(law, rb.relatumConcept, slot.relatumType)) {
      return {
        ok: false,
        rejected: { role: rb.role, reason: 'concept-check' },
        proposal: null,
        prebound: null,
        conjectured: null,
        residualFieldIds: null,
      };
    }
  }

  // Step 2: PARTITION -- FK columns are pre-bound fieldIds; residual is everything else
  const preboundFieldIds = new Set(preboundRaw.map(rb => rb.fieldId));
  const allFields = factSchema['viz:hasField'] || [];
  const residualFields = allFields.filter(f => !preboundFieldIds.has(f.fieldId));
  const residualFieldIds = residualFields.map(f => f.fieldId);
  const residualSchema = { 'viz:hasField': residualFields };

  // Step 3: RUN Binder on residual only
  const binderResult = bind({ schema: residualSchema, lexis, law, scope, config });
  const topProposal = (binderResult['bind:proposals'] || [])[0] || {};
  const topBindings = topProposal['bind:bindings'] || [];

  // Unwrap bind: prefixed keys to bare OCE keys; apply role-XOR (drop if already pre-bound)
  const preboundRoles = new Set(preboundRaw.map(rb => rb.role));
  const conjectured = topBindings
    .map(b => ({
      role: b['bind:role'],
      relatumConcept: b['bind:relatumConcept'],
      fieldId: b['bind:fieldId'],
    }))
    .filter(b => !preboundRoles.has(b.role));

  // Step 4: UNION -- prebound (bare keys) + conjectured
  const prebound = preboundRaw.map(rb => ({
    role: rb.role,
    relatumConcept: rb.relatumConcept,
    fieldId: rb.fieldId,
  }));

  const allRoleBindings = [...prebound, ...conjectured];

  // Step 5: C-2 gate -- every fieldId must pass isFlatBindingSafe
  for (const rb of allRoleBindings) {
    if (!isFlatBindingSafe(rb.fieldId)) {
      return {
        ok: false,
        rejected: { role: rb.role, reason: 'c2-unsafe' },
        proposal: null,
        prebound,
        conjectured,
        residualFieldIds,
      };
    }
  }

  const proposal = {
    recordConcept,
    roleBindings: allRoleBindings,
  };

  return {
    ok: true,
    rejected: null,
    proposal,
    prebound,
    conjectured,
    residualFieldIds,
  };
}
