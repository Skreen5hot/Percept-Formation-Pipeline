import { subsumes, disjointPair } from './lawAdapter.mjs';
import { STATUS, KIND, necessityResult } from './types.mjs';

export function evalNecessity(necessity, edge, law) {
  const { relation, kind, requiredType, requiredBearer } = necessity;

  if (edge == null) {
    return necessityResult({
      relation,
      kind,
      requiredType: requiredType ?? null,
      status: STATUS.EMPTY,
      fulfilledBy: null,
      evidence: 'no configuration element addresses this necessity'
    });
  }

  if (kind === KIND.SUBSUMPTION || kind === KIND.RELATIONAL) {
    const r = edge.relatumConcept;
    if (r == null) {
      return necessityResult({
        relation,
        kind,
        requiredType: requiredType ?? null,
        status: STATUS.EMPTY,
        fulfilledBy: null,
        evidence: 'no relatum'
      });
    }
    if (subsumes(law, r, requiredType)) {
      const evidence = r === requiredType
        ? `${r} = ${requiredType}`
        : `${r} subClassOf ${requiredType}`;
      return necessityResult({
        relation,
        kind,
        requiredType: requiredType ?? null,
        status: STATUS.FULFILLED,
        fulfilledBy: edge.fieldId ?? edge.object ?? null,
        evidence
      });
    }
    const dp = disjointPair(law, r, requiredType);
    if (dp) {
      return necessityResult({
        relation,
        kind,
        requiredType: requiredType ?? null,
        status: STATUS.VIOLATED,
        fulfilledBy: null,
        evidence: `${dp[0]} disjointWith ${dp[1]} (${r} is incompatible with required ${requiredType})`
      });
    }
    return necessityResult({
      relation,
      kind,
      requiredType: requiredType ?? null,
      status: STATUS.EMPTY,
      fulfilledBy: null,
      evidence: `relatum ${r} type unrecognized for ${requiredType}`
    });
  }

  if (kind === KIND.INHERENCE) {
    const bearer = edge.relatumConcept;
    if (subsumes(law, bearer, requiredBearer)) {
      return necessityResult({
        relation,
        kind,
        requiredType: requiredBearer ?? null,
        status: STATUS.FULFILLED,
        fulfilledBy: edge.fieldId ?? edge.object ?? null,
        evidence: `${bearer} subClassOf ${requiredBearer} (admits the dependent)`
      });
    }
    const dp = disjointPair(law, bearer, requiredBearer);
    if (dp) {
      return necessityResult({
        relation,
        kind,
        requiredType: requiredBearer ?? null,
        status: STATUS.VIOLATED,
        fulfilledBy: null,
        evidence: `inherence category error: bearer ${bearer} is ${dp[0]} disjointWith required bearer ${requiredBearer}`
      });
    }
    return necessityResult({
      relation,
      kind,
      requiredType: requiredBearer ?? null,
      status: STATUS.EMPTY,
      fulfilledBy: null,
      evidence: `relatum ${bearer} type unrecognized for ${requiredBearer}`
    });
  }

  return necessityResult({
    relation,
    kind,
    requiredType: requiredType ?? null,
    status: STATUS.EMPTY,
    fulfilledBy: null,
    evidence: `unknown necessity kind: ${kind}`
  });
}
