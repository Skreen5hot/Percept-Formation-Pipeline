export const NOMINAL = 'viz:NominalType';
export const QUANTITATIVE = 'viz:QuantitativeType';
export const BOOLEAN = 'viz:BooleanType';
export const TEMPORAL = 'viz:TemporalType';
export const UNKNOWN = 'viz:UnknownType';

export function mapType(t) {
  switch (t) {
    case 'integer': return { dataType: QUANTITATIVE, numericPrecision: 'integer' };
    case 'number':  return { dataType: QUANTITATIVE, numericPrecision: 'float' };
    case 'boolean': return { dataType: BOOLEAN };
    case 'boolean-encoded-string': return { dataType: BOOLEAN };
    case 'string':  return { dataType: NOMINAL };
    case 'null':    return { dataType: UNKNOWN };
    default:        return { dataType: NOMINAL };
  }
}
