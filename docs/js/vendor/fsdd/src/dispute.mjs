import { lawReference } from './lawRef.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function disputes(input, lawRegistry) {
  const records = [];
  const diagnostics = [];

  const binding = input.binding;
  if (!binding) return { records, diagnostics };

  const proposals = binding['bind:proposals'] ?? [];
  const selected = proposals[0] ?? null;
  const binderDiags = binding['bind:diagnostics'] ?? [];

  const requiresReview = selected?.['bind:requiresReview'] === true;
  const multiProposal = proposals.length >= 2;
  const hasBind002or007 = binderDiags.some(d => d.code === 'BIND-002' || d.code === 'BIND-007');

  const isDisputed = (requiresReview && multiProposal) || hasBind002or007;

  if (!isDisputed) return { records, diagnostics };

  const lawHash = input.judgment?.['oce:lawHash'] ?? null;
  const adjLaw = lawHash ? lawReference(lawHash, lawRegistry) : null;

  const candidates = proposals.slice(0, 2).map(p => ({
    'fsdd:frame': p['bind:proposedBinding']?.recordConcept ?? null,
    'fsdd:verdict': input.judgment?.['oce:verdict'] ?? null,
    'fsdd:adjudicatingLaw': adjLaw,
    'fsdd:confidence': p['bind:confidence'] ?? null
  }));

  records.push({
    '@type': 'fsdd:DisputedBinding',
    'fsdd:scope': 'dataset',
    'fsdd:candidates': candidates,
    'fsdd:resolution': 'commit-gate',
    'fsdd:resolutionReference': null
  });

  diagnostics.push(makeDiagnostic('FSDD-005', { candidates }));

  return { records, diagnostics };
}
