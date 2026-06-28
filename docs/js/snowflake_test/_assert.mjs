export const results = { passed: 0, failed: 0, failures: [] };
export function assert(c, m){ if(c) results.passed++; else { results.failed++; results.failures.push(String(m||'fail')); } }
export function report(){ for(const f of results.failures) console.error('FAIL:', f); console.log(`${results.passed} passed, ${results.failed} failed`); return results.failed === 0; }
