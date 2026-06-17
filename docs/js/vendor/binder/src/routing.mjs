import { makeDiagnostic } from './diagnostics.mjs';

export function applyRouting(proposals, config, marginTolerance = 0.05) {
  const diagnostics = [];

  if (proposals.length === 0) return { proposals, diagnostics };

  const top = proposals[0];
  const confidence = top['bind:confidence'];

  if (confidence < config.commitThreshold) {
    top['bind:requiresReview'] = true;
    diagnostics.push(makeDiagnostic('BIND-008', { routed: 'commit' }));
  } else if (confidence < config.proposeThreshold) {
    top['bind:requiresReview'] = true;
  } else {
    top['bind:requiresReview'] = false;
  }

  if (proposals.length > 1 && top['bind:margin'] <= marginTolerance) {
    top['bind:requiresReview'] = true;
    const frames = [
      top['bind:proposedBinding'] && top['bind:proposedBinding'].recordConcept,
      proposals[1]['bind:proposedBinding'] && proposals[1]['bind:proposedBinding'].recordConcept
    ];
    diagnostics.push(makeDiagnostic('BIND-002', { frames }));
  }

  for (const binding of (top['bind:bindings'] || [])) {
    const bc = binding['bind:bindingConfidence'];
    if (typeof bc === 'number' && bc < 0.5) {
      diagnostics.push(makeDiagnostic('BIND-004', {
        fieldId: binding['bind:fieldId'],
        role: binding['bind:role'],
        convergence: binding['bind:convergence']
      }));
    }
  }

  for (const fieldId of (top['bind:residueFields'] || [])) {
    diagnostics.push(makeDiagnostic('BIND-003', { fieldId }));
  }

  return { proposals, diagnostics };
}
