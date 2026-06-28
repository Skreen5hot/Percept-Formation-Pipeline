// Emit the LIVE snowflake-front graph as Turtle (the structured front + the ship_info -> customer_dim hop) for the
// deploy gate's rdflib real-parse: the published bytes MUST parse in a real RDF parser AND carry the four hop
// outcomes (snowflake_parse.py asserts them). Prints to stdout; the gate pipes it to a .ttl and parses it.
import { runStar } from '../../../runner.js';
import { STAR_SAMPLES } from '../../../ssm.js';

const { stages } = await runStar(STAR_SAMPLES.snowflake.factRows);
process.stdout.write(stages.gm.turtle);
