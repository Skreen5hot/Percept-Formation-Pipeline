import { validateField } from './cismValidate.mjs';
import { classifyStatic } from './staticClassifiers.mjs';

export function alignField(field, config = {}, opts = {}) {
  let decision = validateField(field);
  if (!decision) {
    decision = classifyStatic(field, config, opts.snp);
  }
  if (!decision.extraProps) {
    decision.extraProps = {};
  }
  decision.extraProps['sas:fandawsConsulted'] = opts.scope ? true : false;
  return decision;
}
