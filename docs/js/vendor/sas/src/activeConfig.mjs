import { sortDedupStrings } from './jcs.mjs';

export function buildActiveConfig(config = {}) {
  const nullParts = [];
  if (config.nullVocabulary != null) {
    if (Array.isArray(config.nullVocabulary)) {
      nullParts.push(...config.nullVocabulary);
    } else {
      for (const arr of Object.values(config.nullVocabulary)) {
        nullParts.push(...arr);
      }
    }
  }
  if (Array.isArray(config.globalNullVocabulary)) {
    nullParts.push(...config.globalNullVocabulary);
  }

  const booleanPairs = config.booleanFields != null
    ? Object.entries(config.booleanFields)
        .map(([name, [trueValue, falseValue]]) => ({
          'sas:fieldName': name,
          'sas:trueValue': trueValue,
          'sas:falseValue': falseValue,
        }))
        .sort((a, b) => a['sas:fieldName'] < b['sas:fieldName'] ? -1 : a['sas:fieldName'] > b['sas:fieldName'] ? 1 : 0)
    : [];

  return {
    '@type': 'sas:AlignmentConfiguration',
    'sas:consensusThreshold': config.consensusThreshold ?? 0.95,
    'sas:minObservationThreshold': config.minObservationThreshold ?? 5,
    'sas:nullVocabulary': sortDedupStrings(nullParts),
    'sas:booleanPairs': booleanPairs,
    'sas:temporalNamePattern': config.temporalNamePattern ?? '(?:date|time|timestamp|created|updated|modified|born|died|started|ended|expires?)(?:_at|_on|_time)?$',
  };
}
