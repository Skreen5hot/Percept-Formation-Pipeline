import { normalize } from './proposalNormalize.mjs';
import { resolveConcept, accidentalLocals, constitutiveLocals } from './lawAdapter.mjs';
import { project } from './lawProjection.mjs';
import { collect } from './collector.mjs';
import { evalNecessity } from './evaluate.mjs';
import { inherenceComplete } from './inherenceComplete.mjs';
import { structuralCheck } from './structural.mjs';
import { aggregate } from './aggregate.mjs';
import { assemble } from './assemble.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

export function adjudicate(input) {
  try {
    const law = input && input.law ? input.law : {};
    const proposal = input && input.proposal ? input.proposal : {};
    const percept = input ? input.percept : undefined;
    const config = input ? (input.config || {}) : {};

    // Step 1: normalize proposal
    let norm;
    try { norm = normalize(proposal); } catch (e) {
      return assemble({ concept: null, verdict: 'fails', disposition: 'refuse', necessities: [],
        perceptPresent: !!percept, diagnostics: [makeDiagnostic('OCE-001', { concept: String(e) })],
        lawFragment: project(law, '') });
    }

    const concept = norm.recordConcept || null;

    // Step 2: resolve concept (binding only)
    if (concept) {
      if (!resolveConcept(law, concept)) {
        return assemble({ concept, verdict: 'fails', disposition: 'refuse', necessities: [],
          perceptPresent: !!percept,
          diagnostics: [makeDiagnostic('OCE-001', { concept })],
          lawFragment: project(law, concept || '') });
      }
    }

    // Step 3: collect pairs and evaluate
    let pairs;
    try { pairs = collect(law, norm); } catch (e) { pairs = []; }

    const diagnostics = [];
    const necessities = [];

    // Step 4: ACCIDENTAL-INVARIANCE check
    // For binding: any edge whose relation is NOT in constitutiveLocals -> OCE-008, skip
    const constitutive = concept ? constitutiveLocals(law, concept) : null;

    // Build a set of accidental edges from norm.edges
    const edges = norm.edges || [];
    if (concept && constitutive) {
      for (const edge of edges) {
        const rel = edge.relation;
        if (!constitutive.includes(rel)) {
          diagnostics.push(makeDiagnostic('OCE-008', { relation: rel }));
        }
      }
    }

    // Step 3 continued: evaluate each collected pair
    for (const { necessity, edge } of pairs) {
      let r;
      try { r = evalNecessity(necessity, edge, law); } catch (e) {
        r = { result: { 'oce:relation': necessity.relation, 'oce:kind': necessity.kind,
          'oce:requiredType': necessity.requiredType || null, 'oce:status': 'empty',
          'oce:fulfilledBy': null, 'oce:evidence': 'eval error' }, diagnostic: null };
      }

      let r2;
      try {
        r2 = structuralCheck(r, edge, percept,
          { checkStructuralConsistency: (config.checkStructuralConsistency ?? true) });
      } catch (e) { r2 = r; }

      if (r2.diagnostic) diagnostics.push(r2.diagnostic);

      const result = r2.result || r2;
      const status = result['oce:status'];
      const relation = result['oce:relation'];
      const requiredType = result['oce:requiredType'] || null;

      necessities.push(result);

      if (status === 'empty') {
        diagnostics.push(makeDiagnostic('OCE-002', { relation, requiredType }));
      } else if (status === 'violated') {
        const foundType = result['oce:fulfilledBy'] || null;
        diagnostics.push(makeDiagnostic('OCE-003', { relation, requiredType, foundType }));
      }
    }

    // Step 4.5: Inherence-Completion -- a witnessed quality role entails an empty material bearer; supersede
    // that bearer's plain relational empty with an inherence-cited one. Additive; no-op without a quality
    // role (shipping). Never throws (the firewall invariant).
    try { inherenceComplete(law, norm, necessities); } catch (e) { /* no-op on error */ }

    // Step 5: no percept -> OCE-007
    if (!percept) {
      diagnostics.push(makeDiagnostic('OCE-007', {}));
    }

    // Step 6: aggregate
    let agg;
    try { agg = aggregate(necessities, config); } catch (e) {
      agg = { verdict: 'fails', disposition: 'refuse' };
    }
    const { verdict, disposition } = agg;

    // Step 7: assemble
    const conceptOut = concept || (norm.edges && norm.edges[0] && norm.edges[0].object) || null;
    return assemble({ concept: conceptOut, verdict, disposition, necessities,
      perceptPresent: !!percept, diagnostics, lawFragment: project(law, concept || '') });

  } catch (e) {
    // Never throws invariant
    try {
      const law = input && input.law ? input.law : {};
      const percept = input ? input.percept : undefined;
      return assemble({ concept: null, verdict: 'fails', disposition: 'refuse', necessities: [],
        perceptPresent: !!percept,
        diagnostics: [makeDiagnostic('OCE-001', { concept: 'error: ' + String(e) })],
        lawFragment: project(law, '') });
    } catch (_) {
      return { '@type': 'oce:SynthesisJudgment', 'oce:concept': null, 'oce:verdict': 'fails',
        'oce:disposition': 'refuse', 'oce:necessities': [], 'oce:perceptEvidence': 'absent',
        'oce:diagnostics': [{ code: 'OCE-001', level: 'error', message: 'fatal error' }],
        'oce:lawHash': '0000000000000000000000000000000000000000000000000000000000000000' };
    }
  }
}
