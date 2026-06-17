import { adjudicate } from './vendor/oce/src/adjudicate.mjs';
import LAW from './vendor/law/shipping_law.mjs';

// OCE (Ontological Constraint Engine, PFP stage 5) demo adapter -- the deterministic firewall. It
// adjudicates the Binder's SELECTED proposal against the compiled constitutive law and returns a
// SynthesisJudgment: succeeds | incomplete | fails, with a PER-NECESSITY justification (the self-describing
// judgment of section 3.4 -- the part the UI must render, not just the verdict word). It never asserts.
//
// When the Binder DECLINED (no proposal -- e.g. the APQC sample grounds to no frame), there is nothing to
// adjudicate -> returns null and the demo says so honestly. Adjudication here is SYMBOLIC (no percept
// evidence is passed to OCE -> the judgment carries OCE-007); the verdict turns on the law + the proposed
// binding, which is what the incomplete/fails cases demonstrate.
export function adjudicateProposal(binderResult) {
  const proposals = (binderResult && binderResult['bind:proposals']) || [];
  if (!proposals.length) return null;                       // the Binder declined; nothing to adjudicate
  const proposal = proposals[0]['bind:proposedBinding'];    // {recordConcept, bindings:[{role,fieldId,relatumConcept,...}]}
  return adjudicate({ law: LAW, proposal });                // OCE accepts proposal.bindings (the firewall handoff)
}
