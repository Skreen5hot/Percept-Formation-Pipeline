import { mergeConfig } from './config.mjs';
import { generateCandidates } from './candidates.mjs';
import { assignRoles } from './assignment.mjs';
import { constitutiveRoleSlots, frameRoleSlots } from './frameLaw.mjs';
import { scoreAndRank } from './abduction.mjs';
import { applyRouting } from './routing.mjs';
import { defaultCommitGate } from './commitGate.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

const EMPTY_SCOPE = {
  resolveTerm: () => [],
  getConcept: () => null,
  retrieveFrames: () => []
};

function emptyResult(datasetHash, diags) {
  return {
    '@type': 'bind:BindingProposal',
    'bind:datasetHash': datasetHash || null,
    'bind:proposalSource': 'deterministic',
    'bind:proposals': [],
    'bind:diagnostics': diags
  };
}

export function bind(input) {
  let datasetHash = null;
  try {
    const cfg = mergeConfig((input && input.config) || {});

    const schema = (input && input.schema) || {};
    datasetHash = schema['viz:rawInputHash'] || null;

    const rawFields = schema['viz:hasField'] || [];
    const fields = rawFields.map(f => ({
      ...f,
      fieldId: f.fieldId || f['viz:fieldName']
    }));

    const lexisMap = (input && input.lexis) || {};
    const ctx = {
      law: (input && input.law) || { frames: {}, subClassOf: {} },
      scope: (input && input.scope) || EMPTY_SCOPE,
      context: (input && input.context) || {}
    };

    // Step 3: generate candidates; empty -> BIND-001
    const candidates = generateCandidates(ctx.scope, lexisMap, ctx.context, cfg);
    if (!candidates || candidates.length === 0) {
      return emptyResult(datasetHash, [makeDiagnostic('BIND-001', {})]);
    }

    // Step 4: per-frame role assignment
    const frameAssignments = [];
    for (const frameId of candidates) {
      const assignment = assignRoles(frameId, fields, lexisMap, ctx);
      frameAssignments.push({
        frameId,
        assignment,
        totalFields: fields.length,
        totalConstitutive: constitutiveRoleSlots(ctx.law, frameId).length
      });
    }

    // Step 5: score and rank
    let proposals = scoreAndRank(frameAssignments, cfg.weights);

    // Step 6: routing
    let diagnostics;
    ({ proposals, diagnostics } = applyRouting(proposals, cfg));
    diagnostics = diagnostics ? [...diagnostics] : [];

    // BIND-007: role ambiguity -- field ties for multiple roles at equal (bindingConfidence, agreeCount)
    if (proposals && proposals.length > 0) {
      const topBindings = proposals[0]['bind:bindings'] || [];
      const byField = new Map();
      for (const b of topBindings) {
        const fid = b['bind:fieldId'];
        if (!byField.has(fid)) byField.set(fid, []);
        const bc = typeof b['bind:bindingConfidence'] === 'number' ? b['bind:bindingConfidence'] : 0;
        const ac = Array.isArray(b['bind:convergence'])
          ? b['bind:convergence'].filter(v => v['bind:vote'] === 'agree').length
          : 0;
        byField.get(fid).push({ role: b['bind:role'], bc, ac });
      }
      let ambiguous = false;
      for (const [fieldId, entries] of byField) {
        if (entries.length < 2) continue;
        const lead = entries[0];
        const tied = entries.filter(e => e.bc === lead.bc && e.ac === lead.ac);
        if (tied.length > 1) {
          diagnostics.push(makeDiagnostic('BIND-007', { fieldId, roles: tied.map(e => e.role) }));
          ambiguous = true;
        }
      }
      if (ambiguous) {
        proposals = [{ ...proposals[0], 'bind:requiresReview': true }, ...proposals.slice(1)];
      }
    }

    // Step 7: commit gate on top proposal
    if (proposals && proposals.length > 0) {
      proposals = [defaultCommitGate(proposals[0]), ...proposals.slice(1)];
    }

    // Step 8: return BindingProposal
    return {
      '@type': 'bind:BindingProposal',
      'bind:datasetHash': datasetHash,
      'bind:proposalSource': 'deterministic',
      'bind:proposals': proposals || [],
      'bind:diagnostics': diagnostics
    };

  } catch (e) {
    return emptyResult(datasetHash, [
      makeDiagnostic('BIND-001', { error: String((e && e.message) || e) })
    ]);
  }
}
