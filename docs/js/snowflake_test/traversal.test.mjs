import { assert } from './_assert.mjs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const has = (p) => existsSync(join(root, ...p.split('/')));
import { mapping, dimsData, cases, query, subjectRefTable, subjectConcept, factRoleAssignmentSample } from './snowflake_fixtures.mjs';
const T = (out) => out.triples;
const hasT = (out, s, p, o) => T(out).some(t => t.s === s && t.p === p && (o === undefined || t.o === o));
const typeOf = (out, node) => T(out).filter(t => t.s === node && t.p === 'rdf:type').map(t => t.o);
const objOf = (out, s, p) => T(out).filter(t => t.s === s && t.p === p).map(t => t.o);

// covers: §3 traversal + P-extra-S3 (input shape, matched) + Pin 6 (reuse) + Pin 7/P-extra-5 (leaf-bounded)
if (has('vendor/ssm/src/snowflakeTraversal.mjs')) {
  const Mod = await import('../vendor/ssm/src/snowflakeTraversal.mjs');
  const { traverse, hopResolver } = Mod;
  const { resolveKey } = await import('../vendor/ssm/src/krs.mjs');

  // === P-extra-S3: the input shape exists in the MATCHED shape (the contract S1 consumes; without it §3/§4 read nothing) ===
  const ofk = mapping['ssm:dimensions']['ship_info']['ssm:outgoingFKs'];
  assert(Array.isArray(ofk) && ofk.length === 1, 'P-extra-S3: ship_info carries ssm:outgoingFKs (the input the traversal reads)');
  const e0 = ofk[0];
  assert(e0['ssm:fkColumn'] === 'customer_key' && e0['ssm:refTable'] === 'customer_dim' && e0['ssm:role'] === 'hasCustomer',
    'P-extra-S3: the hop is customer_key -> customer_dim as hasCustomer');
  assert(e0['ssm:nullable'] === true, 'P-extra-S3: the hop is ssm:nullable:true (declares the ship-to ACCIDENTAL; pins it out of the deferred constitutive-deep case)');
  // SAME-SHAPE discriminating check: outgoingFKs uses the SAME field names as ssm:roleAssignments (no parallel convention)
  const faKeys = Object.keys(factRoleAssignmentSample).sort();
  const ofkKeys = Object.keys(e0).filter(k => k !== 'ssm:nullable').sort();
  assert(JSON.stringify(faKeys) === JSON.stringify(ofkKeys),
    'P-extra-S3 SAME-SHAPE: an outgoingFKs entry uses the SAME field names as a fact roleAssignment (+ ssm:nullable) -- not a parallel convention');
  assert(!('concept' in e0) && !('ssm:concept' in e0), 'P-extra-S3: concept is NOT stored inline (it is DERIVED from refTable -> entityClass)');
  assert(mapping['ssm:dimensions'][e0['ssm:refTable']]['ssm:entityClass'] === 'fan:Customer', 'P-extra-S3: the concept is DERIVABLE from refTable -> ssm:entityClass');

  // === Pin 6: reuse the star primitive -- traversal re-exports the SAME resolveKey (no second resolver) ===
  assert(hopResolver === resolveKey, 'Pin 6: traversal re-exports the SAME resolveKey the star front uses (engine-reuse, not a fork)');

  const hopsOf = (name) => traverse({ subjectRefTable, subjectRow: cases[name].subjectRow, mapping, dimsData, query });

  // === §3 resolved (coreferent): one hop, resolved to C1, concept DERIVED, nullable carried ===
  const hr = hopsOf('resolved_coreferent');
  assert(hr.length === 1 && hr[0].outcome === 'resolved' && hr[0].resolvedKey === 'C1', '§3: resolved hop -> outcome resolved, resolvedKey C1');
  assert(hr[0].role === 'hasCustomer' && hr[0].concept === 'fan:Customer' && hr[0].nullable === true, '§3: the hop record carries role + DERIVED concept (fan:Customer) + nullable');

  // === §3 divergent: resolved to C2 (a different witnessed key) ===
  assert(hopsOf('resolved_divergent')[0].resolvedKey === 'C2', '§3: divergent hop resolves to C2');

  // === §3 absent: NULL FK -> outcome absent, no resolvedKey ===
  const ha = hopsOf('absent');
  assert(ha.length === 1 && ha[0].outcome === 'absent' && ha[0].resolvedKey === undefined, '§3: NULL sub-FK -> outcome absent (no resolvedKey)');

  // === §3 dangling: 9999 -> outcome dangling, reason broken-ref (resolveKey passthrough) ===
  const hd = hopsOf('dangling');
  assert(hd.length === 1 && hd[0].outcome === 'dangling' && hd[0].reason === 'broken-ref', '§3: orphan sub-FK -> outcome dangling, reason broken-ref');

  // === Pin 7 / P-extra-5: a LEAF subject (customer_dim, no ssm:outgoingFKs) ends traversal -> [] (no infinite descent; one level) ===
  const leaf = traverse({ subjectRefTable: 'customer_dim', subjectRow: { customer_key: 'C1' }, mapping, dimsData, query });
  assert(Array.isArray(leaf) && leaf.length === 0, 'Pin 7: a leaf subject (no outgoingFKs) ends traversal -> [] (bounded by declared structure)');

  // determinism
  assert(JSON.stringify(hopsOf('resolved_coreferent')) === JSON.stringify(hopsOf('resolved_coreferent')), '§3: deterministic');
}
