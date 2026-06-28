import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { report } from './_assert.mjs';
const here = dirname(fileURLToPath(import.meta.url));
for (const f of readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort()) await import('./' + f);
process.exit(report() ? 0 : 1);
