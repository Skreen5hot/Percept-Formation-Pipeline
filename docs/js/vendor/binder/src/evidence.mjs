import { bindingConfidence } from './scoring.mjs';

export function buildBindingEvidence(binding) {
  return {
    'bind:fieldId': binding.fieldId,
    'bind:role': binding.role,
    'bind:relatumConcept': binding.relatumConcept ?? null,
    'bind:fillerKind': binding.fillerKind,
    'bind:convergence': binding.votes,
    'bind:bindingConfidence': binding.bindingConfidence
  };
}
