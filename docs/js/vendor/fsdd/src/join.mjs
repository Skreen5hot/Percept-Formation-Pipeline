export function joinFields(input) {
  const fields = input.schema['viz:hasField'] || [];
  const cismFields = (input.cism && input.cism.fields) || [];
  const proposal = selectedProposal(input);
  const bindings = (proposal && proposal['bind:bindings']) || [];
  const necessities = (input.judgment && input.judgment['oce:necessities']) || [];

  return fields.map(sasField => {
    const column = sasField['viz:fieldName'];
    const cismField = cismFields.find(f => f.field === column) || null;
    const bindingEvidence = bindings.find(b => b['bind:fieldId'] === column) || null;
    const necessity = necessities.find(n => n['oce:fulfilledBy'] === column) || null;
    return { column, sasField, cismField, bindingEvidence, necessity };
  });
}

export function emptyNecessities(input) {
  const necessities = (input.judgment && input.judgment['oce:necessities']) || [];
  return necessities.filter(n => n['oce:status'] === 'empty' && n['oce:fulfilledBy'] === null);
}

export function selectedProposal(input) {
  return (input.binding && input.binding['bind:proposals'] && input.binding['bind:proposals'][0]) || null;
}
