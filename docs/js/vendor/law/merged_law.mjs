// The merged constitutive law the demo's Binder + OCE consume -- BOTH frames (fan:ActOfShipping +
// fan:ActOfMeasuring) so abductive frame selection chooses per table. Assembled from the two compiled laws
// by experiments/law/merge.mjs (the merge contract). Do not edit by hand.
import SHIPPING from './shipping_law.mjs';
import CLINICAL from './clinical_law.mjs';
import { mergeLaws } from './merge.mjs';
export default mergeLaws(SHIPPING, CLINICAL);
