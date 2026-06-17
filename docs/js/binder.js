import { bind } from './vendor/binder/src/bind.mjs';

// Semantic Binder (SFB, PFP stage 4) demo adapter. The Binder is the conjectural proposal layer: it
// proposes that the rows fall under a conceptual FRAME and binds each column to a role, by CONVERGENCE
// across independent channels. It never asserts (the OCE would adjudicate; not built).
//
// HONEST DEMO SHIMS (stated in the UI): the morphology channel's lexis is SYNTHESISED by a name-tokenizer
// (DKNP is not built); the frames + role-slots are a small DEMO catalog (the full constitutive law /
// W2Fuel ontology+RCR is not built); the Fandaws scope is a demo terminology set with frame retrieval. The
// faithful consequence: the APQC process sample grounds to NO frame, so the Binder DECLINES (BIND-001) --
// declining when nothing converges is its core safety property. A shipment-shaped table (driver / vehicle /
// origin / destination / date columns) DOES bind, with a convergence-with-review profile.

const LAW = { frames: {
  'fan:ActOfShipping': { roles: [
    { role: 'hasAgent',       relatumType: 'fan:Agent',          fillerKind: 'reference', constitutive: true, multiplicity: 'one' },
    { role: 'usesVehicle',    relatumType: 'fan:Vehicle',        fillerKind: 'reference', constitutive: true, multiplicity: 'one' },
    { role: 'hasObject',      relatumType: 'fan:Object',         fillerKind: 'reference', constitutive: true, multiplicity: 'one' },
    { role: 'hasOrigin',      relatumType: 'fan:Site',           fillerKind: 'literal',   constitutive: true, multiplicity: 'one' },
    { role: 'hasDestination', relatumType: 'fan:Site',           fillerKind: 'literal',   constitutive: true, multiplicity: 'one' },
    { role: 'occupies',       relatumType: 'fan:TemporalRegion', fillerKind: 'literal',   constitutive: true, multiplicity: 'one' } ] } },
  subClassOf: { 'fan:Driver': ['fan:Agent'], 'fan:Truck': ['fan:Vehicle'], 'fan:City': ['fan:Site'],
                'fan:Date': ['fan:TemporalRegion'], 'fan:Goods': ['fan:Object'] } };

const CONCEPTS = {
  'fan:Driver': { id: 'fan:Driver', broader: ['fan:Agent'] },
  'fan:Truck':  { id: 'fan:Truck',  broader: ['fan:Vehicle'] },
  'fan:City':   { id: 'fan:City',   broader: ['fan:Site'] },
  'fan:Date':   { id: 'fan:Date',   broader: ['fan:TemporalRegion'] },
  'fan:Goods':  { id: 'fan:Goods',  broader: ['fan:Object'] } };

const TERM = {
  driver: 'fan:Driver', operator: 'fan:Driver', pilot: 'fan:Driver', carrier: 'fan:Driver',
  vehicle: 'fan:Truck', truck: 'fan:Truck', transport: 'fan:Truck',
  origin: 'fan:City', source: 'fan:City', from: 'fan:City', city: 'fan:City',
  destination: 'fan:City', dest: 'fan:City', to: 'fan:City',
  ship: 'fan:Date', shipped: 'fan:Date', date: 'fan:Date', delivery: 'fan:Date', departure: 'fan:Date',
  goods: 'fan:Goods', cargo: 'fan:Goods', product: 'fan:Goods', item: 'fan:Goods' };

function resolveTerm(label) { const id = TERM[String(label || '').toLowerCase()]; return id ? [CONCEPTS[id]] : []; }

const SCOPE = {
  resolveTerm,
  getConcept: (id) => CONCEPTS[id] || null,
  // retrieve a candidate frame only when the columns actually ground to known concepts -- otherwise the
  // Binder gets no frame and honestly declines (BIND-001). This is what makes the APQC sample decline.
  retrieveFrames: (seed) => {
    const heads = (seed && seed.heads) || [];
    const grounded = heads.filter((h) => resolveTerm(h).length > 0).length;
    return grounded >= 2 ? ['fan:ActOfShipping'] : [];
  } };

// DKNP-lexis synthesiser (a name tokenizer; DKNP is not built). head = the first non-id token; markers
// flag 'id' (coded identifier -> reference filler) and 'date' (temporal).
function lexisFor(field) {
  const name = field['viz:fieldName'] || field.fieldId || '';
  const tokens = String(name).replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  const lower = tokens.map((t) => t.toLowerCase());
  const markers = [];
  if (lower.includes('id') || /id$/i.test(name)) markers.push('id');
  const dt = field['viz:hasDataType'] && field['viz:hasDataType']['@id'];
  if (dt === 'viz:TemporalType' || lower.some((t) => ['date', 'time', 'timestamp'].includes(t))) markers.push('date');
  const head = lower.find((t) => t !== 'id') || lower[0] || '';
  return { head, markers };
}

export function bindSchema(sasSchema) {
  const fields = ((sasSchema && sasSchema['viz:hasField']) || [])
    .map((f) => ({ ...f, fieldId: f.fieldId || f['viz:fieldName'] }));
  const lexis = {};
  for (const f of fields) lexis[f.fieldId] = lexisFor(f);
  const schema = { ...sasSchema, 'viz:hasField': fields };
  return bind({ schema, lexis, law: LAW, scope: SCOPE, context: {} });
}
