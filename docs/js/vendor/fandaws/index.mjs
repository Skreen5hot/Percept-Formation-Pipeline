'use strict';

export function buildIndex(records) {
  const map = new Map();
  for (const record of records) {
    const frozen = deepFreeze(Object.assign({}, record, {
      alternateLabels: record.alternateLabels.slice(),
      broader: record.broader.slice(),
      codedValues: record.codedValues.slice(),
    }));
    map.set(record.id, frozen);
  }
  return Object.freeze(map);
}

function deepFreeze(obj) {
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) Object.freeze(val);
  }
  return Object.freeze(obj);
}
