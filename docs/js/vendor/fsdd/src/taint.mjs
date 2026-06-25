export const LEVELS = ['L0','L1','L2','L3','L4','L5'];

export function maxLevel(a, b) {
  return LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b;
}

export function fieldTaint(signals = {}, opts = {}) {
  const entries = [];
  const { ssm, bibss, sas, binder, oce } = signals;

  // structured-source front (SSM): a field's provenance is FK-resolution against a declared dimension (or a
  // declared residual column), NOT raw-bytes inference -- a first-class source, never laundered through
  // bibss/sas. Additive: raw-path callers pass no ssm signal, so entries/derivation are byte-identical.
  if (ssm != null)  entries.push({ stage: 'structured-source', floor: ssm.floor, why: ssm.why });
  if (bibss != null) entries.push({ stage: 'bibss', floor: bibss.floor, why: bibss.why });
  if (sas != null)   entries.push({ stage: 'sas',   floor: sas.floor,   why: sas.why });
  if (binder != null) entries.push({ stage: 'binder', floor: binder.floor, why: binder.why });
  if (oce != null)   entries.push({ stage: 'oce',   floor: oce.floor,   why: oce.why });

  let level = 'L0';
  for (const e of entries) {
    level = maxLevel(level, e.floor);
  }

  if (level === 'L0') level = 'L1';

  if (opts.probabilisticBump && level !== 'L5') {
    const idx = LEVELS.indexOf(level);
    const bumped = LEVELS[Math.min(idx + 1, 4)];
    level = bumped;
  }

  const derivation = entries.map(e => `${e.stage}:${e.why}->${e.floor}`);

  return { level, derivation };
}
