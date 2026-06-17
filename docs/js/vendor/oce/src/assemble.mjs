import { canonicalize, sha256hex } from './jcs.mjs';

export function assemble({ concept, verdict, disposition, necessities, perceptPresent, diagnostics, lawFragment }) {
  return {
    '@type': 'oce:SynthesisJudgment',
    'oce:concept': concept,
    'oce:verdict': verdict,
    'oce:perceptEvidence': perceptPresent ? 'present' : 'absent',
    'oce:necessities': necessities,
    'oce:disposition': disposition,
    'oce:lawHash': sha256hex(canonicalize(lawFragment)),
    'oce:diagnostics': diagnostics
  };
}
