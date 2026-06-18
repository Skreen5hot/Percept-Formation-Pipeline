// The merged constitutive law the demo's Binder + OCE consume -- ALL frames (fan:ActOfShipping +
// fan:ActOfMeasuring + fan:ActOfSale + fan:ActOfPurchase) so abductive frame selection chooses per table.
// Assembled from the compiled laws by experiments/law/merge.mjs (the merge contract). Do not edit by hand.
import SHIPPING from './shipping_law.mjs';
import CLINICAL from './clinical_law.mjs';
import TRANSACTION from './transaction_law.mjs';
import { mergeLaws } from './merge.mjs';
// mergeLaws is binary; fold the three compiled laws -> all four frames for abductive selection.
export default mergeLaws(mergeLaws(SHIPPING, CLINICAL), TRANSACTION);
