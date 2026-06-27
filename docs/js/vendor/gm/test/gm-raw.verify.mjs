// OUTPUT-FIDELITY of the RAW-front graph: asserts the emitted triples' claims for the honesty-ladder raw samples.
// Clinical (resolved + ICE): blank-node frames, reference->witnessed entity, literal->literal, ICE not typed as its
// concernsType. Mislabeled (violated): an ExcludedFrame, no valid frame. Deploy-gate check (spec raw-front-scope sec.).
import { buildRawSamples } from './gm-raw.emit.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const typesOf = (tt, n) => tt.filter((t) => t.s === n && t.p === 'rdf:type').map((t) => t.o);
const concernsOf = (tt, n) => (tt.find((t) => t.s === n && t.p === 'fsdd:concernsType') || {}).o;
const objOf = (tt, s, p) => tt.filter((t) => t.s === s && t.p === p).map((t) => t.o);

const { clinical, mislabeled } = buildRawSamples();

// === Clinical: per-row blank-node frames; reference/literal branch; ICE ===
{
  const tt = clinical.triples;
  const frames = [...new Set(tt.filter((t) => t.p === 'rdf:type' && t.o === 'fan:ActOfMeasuring').map((t) => t.s))];
  ok(frames.length === 6 && frames.every((f) => f.startsWith('_:')), 'clinical: 6 per-row BLANK-NODE frames (identity-deferred -- no synthesized frame IRI)');
  const F0 = '_:ActOfMeasuring-0';
  ok(objOf(tt, F0, 'fan:hasSubject')[0] === 'fdata:Subject/S1' && typesOf(tt, 'fdata:Subject/S1').includes('fan:Subject'),
    'clinical REFERENCE: subject -> a witnessed-identity entity fdata:Subject/S1 a fan:Subject');
  const glu = tt.find((t) => t.s === F0 && t.p === 'fan:measuresQuality');
  ok(glu && glu.lit === true && !tt.some((t) => t.s === glu.o && t.p === 'rdf:type'), 'clinical LITERAL: a measured value -> an RDF literal, NOT typed as a class');
  const ice = objOf(tt, F0, 'fan:hasPerformer')[0];
  ok(ice && typesOf(tt, ice).includes('fsdd:ImplicitEntityRecord') && !typesOf(tt, ice).includes(concernsOf(tt, ice)),
    'clinical ICE: an absent constitutive role -> an ImplicitEntityRecord, NOT typed as its concernsType');
}
// === Mislabeled: a violated constitutive role -> ExcludedFrame, no valid frame ===
{
  const tt = mislabeled.triples;
  ok(!tt.some((t) => t.p === 'rdf:type' && t.o === 'fan:ActOfShipping'), 'mislabeled: a violated mapping -> NO valid fan:ActOfShipping frame');
  const x = tt.filter((t) => t.p === 'rdf:type' && t.o === 'fsdd:ExcludedFrame').map((t) => t.s)[0];
  ok(x && (objOf(tt, x, 'fsdd:reason')[0] || '').includes('hasAgent'), 'mislabeled: an ExcludedFrame whose reason names the violated role (hasAgent)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
