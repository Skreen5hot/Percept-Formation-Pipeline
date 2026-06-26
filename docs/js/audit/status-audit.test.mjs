// RED-first acceptance for the STATUS-PAGE ledger (instance 2). Proves it inherits CAP-A/CAP-B from the engine
// and that each claim is non-vacuous on its own failure mode -- especially the LOAD-BEARING one: a verified
// grade with no reference must FAIL (a naked grade is not assertable; that is where implementation (i) lives).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { audit, completeness } from './auditor.mjs';
import { STATUS_LEDGER } from './status-ledger.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, '..', '..', 'data', 'status.json'), 'utf8'));
const vendored = new Set(readdirSync(join(here, '..', 'vendor'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name.toLowerCase()));
const ctx = { vendored };
const fired = (m, id) => audit(m, ctx, STATUS_LEDGER).rulings.find((r) => r.id === id && !r.ok);

// the REAL manifest passes + is fully covered (CAP-B)
const a = audit(manifest, ctx, STATUS_LEDGER);
ok(a.ok, 'real status manifest PASSES the audit' + (a.ok ? '' : ' -- ' + JSON.stringify(a.violations || a.errors)));
const cmp = completeness(manifest, STATUS_LEDGER);
ok(cmp.ok && cmp.uncovered.length === 0 && cmp.deferred.length === 0,
  'CAP-B: the status ledger fully covers the manifest' + (cmp.ok ? '' : ' -- ' + JSON.stringify(cmp.uncovered || cmp.errors)));

// SP-1: a Built component with no vendored engine (the FSDD-parallel; presence is the witness)
ok(fired({ components: [{ name: 'GHOST', status: 'Built' }] }, 'SP-1-status-witnessed-by-presence'),
  'SP-1: a Built component with no vendored engine is caught');
ok(fired({ components: [{ name: 'OCE', status: 'NotYetBuilt' }] }, 'SP-1-status-witnessed-by-presence'),
  'SP-1: a NotYetBuilt component that IS present is caught (false absence)');

// SP-2 (LOAD-BEARING): a verified grade with NO reference must FAIL -- this is where (i) lives or dies
ok(fired({ components: [{ name: 'SNP', status: 'Built', grade: 'verified' }] }, 'SP-2-grade-witnessed-by-disclosure'),
  'SP-2 (load-bearing): a verified grade with NO gradeWitness reference is caught -- a naked grade is not assertable');
ok(fired({ components: [{ name: 'SNP', status: 'Built', grade: 'gold' }] }, 'SP-2-grade-witnessed-by-disclosure'),
  'SP-2: an unrecognized grade is caught');
ok(!audit({ components: [{ name: 'SNP', status: 'Built', grade: 'verified', gradeWitness: 'factory: a real, well-formed proof reference' }] }, ctx, STATUS_LEDGER).rulings.find((r) => r.id === 'SP-2-grade-witnessed-by-disclosure' && !r.ok),
  'SP-2: a verified grade WITH a well-formed reference PASSES (the disclosure witnesses it)');

// SP-3: out-of-scope but a vendored engine is present
ok(fired({ components: [], scope: { outOfScope: ['OCE'] } }, 'SP-3-scope-witnessed'),
  'SP-3: an out-of-scope component that IS present is caught (contradiction)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
