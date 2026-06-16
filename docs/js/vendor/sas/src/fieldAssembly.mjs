export function normalizeFieldName(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'field' : slug;
}

export function assignFieldId(name, used) {
  const slug = normalizeFieldName(name);
  if (!used.has(slug)) {
    used.add(slug);
    return 'viz:field/' + slug;
  }
  let i = 1;
  while (used.has(slug + '-' + i)) i++;
  const candidate = slug + '-' + i;
  used.add(candidate);
  return 'viz:field/' + candidate;
}

export function buildDataField(field, decision, id, snp = null) {
  const obj = {
    '@id': id,
    '@type': 'viz:DataField',
    'viz:fieldName': field.name,
    'viz:hasDataType': { '@id': decision.dataType },
    'viz:consensusScore': decision.score,
    'sas:consensusNumerator': decision.numerator,
    'sas:consensusDenominator': decision.denominator,
    'sas:alignmentRule': decision.rule,
    'sas:structuralType': decision.structuralType,
    'sas:fandawsConsulted': decision.extraProps['sas:fandawsConsulted'] === true,
  };

  const reserved = new Set(Object.keys(obj));
  if (decision.extraProps) {
    for (const [k, v] of Object.entries(decision.extraProps)) {
      if (!reserved.has(k)) obj[k] = v;
    }
  }

  if (decision.numericPrecision !== undefined && decision.numericPrecision !== null) {
    obj['viz:numericPrecision'] = decision.numericPrecision;
  }

  if (snp && Array.isArray(snp.entries)) {
    const fieldNameLower = field.name.toLowerCase();
    const hasNormalized = snp.entries.some(
      e => e.detail && e.detail.type === 'currency_stripped' && e.path.toLowerCase() === fieldNameLower
    );
    if (hasNormalized) obj['viz:wasNormalized'] = true;

    const hasPercentage = snp.entries.some(
      e => e.detail && e.detail.type === 'percent_stripped' && e.path.toLowerCase() === fieldNameLower
    );
    if (hasPercentage) obj['viz:wasPercentage'] = true;
  }

  return obj;
}
