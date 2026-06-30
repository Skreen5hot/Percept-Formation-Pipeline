// Per-honesty-ladder-sample ABox emitter: `node gm.emit-sample.mjs <clean|ice|orphan|snowflake>` -> Turtle on
// stdout. The DL gate takes ONE abox per run, and the BFO/CCO review scopes FOUR separate ABoxes, so each star
// sample emits to its own .ttl (snowflake uses the star+hop compose; the rest use the star path). Used by the
// Phase-0 DL gate wiring (S9) and for manual gate validation.
import { resolveStar, STAR_SAMPLES } from '../../../ssm.js';
import { materializeStar, materializeStarSnowflake } from '../../../gm.js';

const name = process.argv[2];
const sample = STAR_SAMPLES[name];
if (!sample) { console.error(`unknown sample '${name}'. choose: ${Object.keys(STAR_SAMPLES).join(', ')}`); process.exit(2); }
const rows = sample.factRows;
const resolved = resolveStar(rows);
const out = name === 'snowflake' ? materializeStarSnowflake(resolved, rows) : materializeStar(resolved, rows);
process.stdout.write(out.turtle + '\n');
