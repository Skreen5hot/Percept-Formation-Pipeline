import { coverage, residue, meanConvergence, frameScore, proposalConfidence, margin } from './scoring.mjs';
import { buildBindingEvidence } from './evidence.mjs';

export function scoreAndRank(frameAssignments, weights) {
  const proposals = frameAssignments.map(({ frameId, assignment, totalFields, totalConstitutive }) => {
    const filledConstitutive = assignment.bindings.filter(b => {
      const frame = frameAssignments.find(fa => fa.frameId === frameId);
      return true;
    }).length;

    const cov = coverage(filledConstitutive, totalConstitutive);
    const res = residue(assignment.residueFields.length, totalFields);
    const bcs = assignment.bindings.map(b => b.bindingConfidence);
    const mc = meanConvergence(bcs);
    const score = frameScore(weights, cov, res, mc);
    const conf = proposalConfidence(cov, mc);

    return {
      'bind:proposedBinding': {
        recordConcept: frameId,
        bindings: assignment.bindings.map(b => ({
          role: b.role,
          fieldId: b.fieldId,
          relatumConcept: b.relatumConcept ?? null,
          fillerKind: b.fillerKind
        }))
      },
      'bind:frameScore': score,
      'bind:confidence': conf,
      'bind:margin': 0,
      'bind:requiresReview': false,
      'bind:bindings': assignment.bindings.map(buildBindingEvidence),
      'bind:residueFields': assignment.residueFields,
      _score: score,
      _frameId: frameId
    };
  });

  proposals.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return a._frameId < b._frameId ? -1 : a._frameId > b._frameId ? 1 : 0;
  });

  for (let i = 0; i < proposals.length; i++) {
    const nextScore = i + 1 < proposals.length ? proposals[i + 1]._score : proposals[i]._score;
    proposals[i]['bind:margin'] = margin(proposals[i]._score, nextScore);
  }

  for (const p of proposals) {
    delete p._score;
    delete p._frameId;
  }

  return proposals;
}
