import { DIAG } from './types.mjs';
import { makeDiagnostic } from './ids.mjs';

export function sampleRecords(records, config) {
  const { sampleSize } = config;

  if (records.length <= sampleSize) {
    return { sampled: records, samplingInfo: { applied: false } };
  }

  const halfSize = sampleSize / 2;
  const head = records.slice(0, Math.floor(halfSize));
  const remaining = records.length - head.length;
  const stride = Math.floor(remaining / halfSize);

  const tail = [];
  for (let i = head.length; i < records.length; i += stride) {
    tail.push(records[i]);
  }

  const sampled = [...head, ...tail];
  const samplingInfo = {
    applied: true,
    inputSize: records.length,
    sampleSize,
    strategy: 'strided',
  };
  const diagnostics = [
    makeDiagnostic('info', DIAG.BIBSS_002, 'Sampling applied: strided', {
      inputSize: records.length,
      sampleSize,
    }),
  ];

  return { sampled, samplingInfo, diagnostics };
}
