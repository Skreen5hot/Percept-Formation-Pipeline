// Emit the materialized graph (Turtle) for the honesty-ladder samples, via the LIVE path
// (resolveStar -> materializeStar -> toTurtle), to stdout. The deploy gate pipes this into a REAL RDF parser
// (rdflib) so the published graph is proven to be valid, parseable Turtle -- not merely a string that "looks"
// like RDF. This closes the gap that shipped an invalid graph: the suite asserted over the in-memory triple
// array; this emits the ACTUAL serialized artifact for a real parser to accept or reject.
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStar } from '../../../gm.js';
import { toTurtle } from '../src/serialize.mjs';

const CLEAN = STAR_SAMPLES.clean.factRows[0];
const rows = [
  CLEAN,
  { ...CLEAN, order_id: 9 },                                            // coreference
  STAR_SAMPLES.ice.factRows[0],                                         // absent constitutive -> ICE
  { ...CLEAN, order_id: 5, shipper_key: 'NOPE' },                       // accidental-broken -> UnresolvedRole
  STAR_SAMPLES.orphan.factRows[0],                                      // excluded (single dangler)
  { ...CLEAN, order_id: 4, customer_key: 'C-ORPHAN', product_key: 'P-GONE' }, // excluded (two danglers)
];
const all = [];
for (const r of rows) all.push(...materializeStar(resolveStar([r]), [r]).triples);
process.stdout.write(toTurtle(all) + '\n');
