import { canonicalize } from './jcs.mjs';
import { buildActiveConfig } from './activeConfig.mjs';
import { rootMeta } from './meta.mjs';
import { alignField } from './cascade.mjs';
import { assignFieldId, buildDataField } from './fieldAssembly.mjs';
import { makeDiagnostic } from './diagnostics.mjs';

const DEFAULT_TEMPORAL_PATTERN =
  '(?:date|time|timestamp|created|updated|modified|born|died|started|ended|expires?)(?:_at|_on|_time)?$';

function parseLeadingNumeric(v) {
  if (v == null) return null;
  const m = String(v).match(/^(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export function align(cism, rawHash, config = {}, opts = {}) {
  try {
    // SAS-007: version check
    if (cism.version !== undefined && cism.version !== null) {
      const leading = parseLeadingNumeric(cism.version);
      if (leading !== null && leading < 1.3) {
        return {
          status: 'error',
          diagnostics: [makeDiagnostic('SAS-007', null, { level: 'fatal' })],
        };
      }
    }

    // Merge config with defaults
    const mergedConfig = Object.assign(
      {
        consensusThreshold: 0.95,
        minObservationThreshold: 5,
        temporalNamePattern: DEFAULT_TEMPORAL_PATTERN,
      },
      config
    );

    // Pick root node and properties
    const root = cism.root;
    let properties;
    if (root.kind === 'array' || root.itemType) {
      properties = root.itemType.properties;
    } else {
      properties = root.properties;
    }

    const fields = [];
    const diagnostics = [];
    const used = new Set();

    for (const key of Object.keys(properties)) {
      const field = properties[key];
      if (field.kind === 'object' || field.kind === 'array') {
        diagnostics.push(makeDiagnostic('SAS-003', field.name || key, {}));
        continue;
      }
      const d = alignField(field, mergedConfig, opts);
      const id = assignFieldId(field.name !== undefined ? field.name : key, used);
      used.add(id);
      fields.push(buildDataField(field, d, id, opts.snp || null));
      for (const diag of d.diagnostics) {
        diagnostics.push(diag);
      }
    }

    const schema = Object.assign(
      { '@type': 'viz:DatasetSchema' },
      rootMeta(root, rawHash),
      {
        'sas:fandawsAvailable': opts.scope ? true : false,
        'sas:alignmentMode': opts.scope ? 'enriched' : 'standalone',
        'sas:activeConfig': buildActiveConfig(config),
        'viz:hasField': fields,
      }
    );

    return { status: 'ok', schema, diagnostics };
  } catch (err) {
    return {
      status: 'error',
      diagnostics: [makeDiagnostic('SAS-007', null, { level: 'fatal', message: String(err) })],
    };
  }
}
