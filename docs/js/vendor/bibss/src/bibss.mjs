import { detectFormat, normalizeJSON } from './json-normalize.mjs';
import { parseAndNormalizeCSV } from './csv-normalize.mjs';
import { narrowCSVTypes } from './csv-narrow.mjs';
import { inferSchema } from './inference-engine.mjs';
import { sampleRecords } from './sampling.mjs';
import { createAdapterRegistry } from './adapter-registry.mjs';
import { toJsonSchema } from './adapter-jsonschema.mjs';
import { toCismRaw } from './adapter-cism-raw.mjs';
import { DEFAULT_INFER_CONFIG, CISM_VERSION, DIAG } from './types.mjs';
import { makeDiagnostic } from './ids.mjs';

export function createBIBSS() {
  const adapters = createAdapterRegistry();
  adapters.register('jsonschema', toJsonSchema);
  adapters.register('cism', toCismRaw);

  function infer(input, config) {
    try {
      let inputStr;
      if (input instanceof ArrayBuffer) {
        inputStr = new TextDecoder().decode(input);
      } else {
        inputStr = String(input);
      }

      const diagnostics = [];
      const mergedConfig = { ...DEFAULT_INFER_CONFIG, ...config };

      if (inputStr === '') {
        diagnostics.push(makeDiagnostic('info', DIAG.BIBSS_007, 'Empty input'));
        return { cism: null, diagnostics };
      }

      const format = detectFormat(inputStr, mergedConfig);

      if (inputStr.length > mergedConfig.maxSizeWarning) {
        diagnostics.push(makeDiagnostic('warning', DIAG.BIBSS_001, 'Input exceeds 10MB', {
          size: inputStr.length,
          limit: mergedConfig.maxSizeWarning,
        }));
      }

      let records;
      let inputFormat;

      if (format === 'json') {
        const result = normalizeJSON(inputStr);
        for (const d of result.diagnostics) diagnostics.push(d);
        if (result.records === null) return { cism: null, diagnostics };
        records = result.records;
        const trimmed = inputStr.trimStart();
        inputFormat = trimmed[0] === '[' ? 'json-array' : 'json-object';
      } else {
        const csvConfig = { ...mergedConfig, maxSizeWarning: Number.MAX_SAFE_INTEGER };
        const result = parseAndNormalizeCSV(inputStr, csvConfig);
        for (const d of result.diagnostics) diagnostics.push(d);
        if (result.rows === null) return { cism: null, diagnostics };
        records = narrowCSVTypes(result.rows);
        inputFormat = 'csv';
      }

      const { sampled, samplingInfo } = sampleRecords(records, mergedConfig);
      if (samplingInfo.applied) {
        diagnostics.push(makeDiagnostic('info', DIAG.BIBSS_002, 'Sampling applied', {
          inputSize: samplingInfo.inputSize,
          sampleSize: samplingInfo.sampleSize,
          strategy: samplingInfo.strategy,
        }));
      }

      const root = inferSchema(sampled, mergedConfig, '#');

      const cism = {
        version: CISM_VERSION,
        generatedAt: new Date().toISOString(),
        config: mergedConfig,
        sampling: samplingInfo,
        inputFormat,
        root,
      };

      return { cism, diagnostics };
    } catch (e) {
      return {
        cism: null,
        diagnostics: [makeDiagnostic('error', 'BIBSS-000', e && e.message ? e.message : 'Unknown error')],
      };
    }
  }

  function project(cism, adapterName) {
    const adapter = adapters.get(adapterName);
    if (adapter === undefined) {
      throw new TypeError(`Unknown adapter: ${adapterName}`);
    }
    return adapter(cism);
  }

  return { infer, project, adapters };
}

export const BIBSS = createBIBSS();
