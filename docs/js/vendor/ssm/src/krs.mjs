export function resolveKey({ fkValue, candidates, validInstant, assertionHorizon }) {
  if (fkValue === null || fkValue === undefined) {
    return { state: 'absent' };
  }

  const keyMatches = candidates.filter(c => c.businessKey === fkValue);

  if (keyMatches.length === 0) {
    return { state: 'dangling', reason: 'broken-ref' };
  }

  const effective = keyMatches.filter(c => {
    const coversInstant = c.validFrom <= validInstant && (c.validTo === null || validInstant < c.validTo);
    const withinHorizon = c.assertedAt <= assertionHorizon;
    return coversInstant && withinHorizon;
  });

  if (effective.length === 0) {
    return { state: 'dangling', reason: 'temporal-nonoverlap' };
  }

  const best = effective.reduce((a, b) => (b.assertedAt > a.assertedAt ? b : a));

  return {
    state: 'resolved',
    entity: best.content,
    businessKey: best.businessKey,
    assertedAt: best.assertedAt,
    sourceEventId: best.id,
  };
}

export function resolveKeyTemporal({ fkValue, candidates, assertionHorizon }) {
  if (fkValue === null || fkValue === undefined) {
    return { state: 'absent' };
  }

  const keyMatches = candidates.filter(c => c.businessKey === fkValue);

  if (keyMatches.length === 0) {
    return { state: 'dangling', reason: 'broken-ref' };
  }

  const withinHorizon = keyMatches.filter(c => c.assertedAt <= assertionHorizon);
  const sorted = [...withinHorizon].sort((a, b) =>
    a.assertedAt < b.assertedAt ? -1 : a.assertedAt > b.assertedAt ? 1 : 0
  );

  return {
    state: 'resolved',
    versions: sorted.map(c => ({
      businessKey: c.businessKey,
      assertedAt: c.assertedAt,
      sourceEventId: c.id,
      entity: c.content,
    })),
  };
}

export function resolvePolymorphic({ discriminatorValue, idValue, typeMap, dimsData, validInstant, assertionHorizon }) {
  if (discriminatorValue === null || discriminatorValue === undefined ||
      idValue === null || idValue === undefined) {
    return { state: 'absent' };
  }

  if (!Object.prototype.hasOwnProperty.call(typeMap, discriminatorValue)) {
    return { state: 'dangling', reason: 'unrecognized-discriminator' };
  }

  const { refTable, entityClass } = typeMap[discriminatorValue];
  const candidates = dimsData[refTable] || [];
  const inner = resolveKey({ fkValue: idValue, candidates, validInstant, assertionHorizon });

  if (inner.state === 'resolved') {
    return {
      state: 'resolved',
      entity: inner.entity,
      businessKey: inner.businessKey,
      assertedAt: inner.assertedAt,
      sourceEventId: inner.sourceEventId,
      refTable,
      entityClass,
    };
  }

  return { state: 'dangling', reason: inner.reason };
}
