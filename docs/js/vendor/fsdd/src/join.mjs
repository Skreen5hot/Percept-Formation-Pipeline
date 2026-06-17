export function joinFields(input) {
  const fields = (input.schema && input.schema['viz:hasField']) || [];
  const cismFields = (input.cism && input.cism.fields) || [];
  const proposal =
    input.binding &&
    input.binding['bind:proposals'] &&
    input.binding['bind:proposals'][0];
  const bindings = (proposal && proposal['bind:bindings']) || [];
  const necessities =
    (input.judgment && input.judgment['oce:necessities']) || [];

  const bindingByFieldId = new Map();
  for (const b of bindings) bindingByFieldId.set(b['bind:fieldId'], b);

  const necessityByRelation = new Map();
  const necessityByFulfilledBy = new Map();
  for (const n of necessities) {
    necessityByRelation.set(n['oce:relation'], n);
    if (n['oce:fulfilledBy'] != null)
      necessityByFulfilledBy.set(n['oce:fulfilledBy'], n);
  }

  const cismByName = new Map();
  for (const c of cismFields) cismByName.set(c.field, c);

  return fields.map(sasField => {
    const column = sasField['viz:fieldName'];
    const cismField = cismByName.get(column) || null;
    const bindingEvidence = bindingByFieldId.get(column) || null;
    const necessity = bindingEvidence
      ? (necessityByRelation.get(bindingEvidence['bind:role']) || null)
      : (necessityByFulfilledBy.get(column) || null);
    return { column, sasField, cismField, bindingEvidence, necessity };
  });
}

export function emptyNecessities(input) {
  const necessities =
    (input.judgment && input.judgment['oce:necessities']) || [];
  return necessities.filter(n => n['oce:status'] === 'empty');
}

export function selectedProposal(input) {
  return (
    (input.binding &&
      input.binding['bind:proposals'] &&
      input.binding['bind:proposals'][0]) ||
    null
  );
}
