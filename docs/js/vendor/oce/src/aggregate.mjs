import { VERDICT, STATUS, DISPOSITION } from './types.mjs';

export function aggregate(results, config = {}) {
  const owaSilenceIsIncomplete = config.owaSilenceIsIncomplete ?? true;
  let verdict;
  if (results.some(r => r['oce:status'] === STATUS.VIOLATED)) {
    verdict = VERDICT.FAILS;
  } else if (owaSilenceIsIncomplete && results.some(r => r['oce:status'] === STATUS.EMPTY)) {
    verdict = VERDICT.INCOMPLETE;
  } else {
    verdict = VERDICT.SUCCEEDS;
  }
  return { verdict, disposition: DISPOSITION[verdict] };
}
