import { bind } from './vendor/binder/src/bind.mjs';
import LAW from './vendor/law/shipping_law.mjs';

// Semantic Binder (SFB, PFP stage 4) demo adapter. The Binder proposes that the rows fall under a
// conceptual FRAME and binds each column to a role, by CONVERGENCE across independent channels. It never
// asserts (the OCE would adjudicate; not built).
//
// The frame catalog is now the REAL compiled constitutive law (js/vendor/law/shipping_law.mjs), produced
// by the minimal W2Fuel slice (IntegratedAgent/experiments/w2fuel_compile.py) from a hand-authored OWL 2
// RL + RCR ontology -- one frame (fan:ActOfShipping), real, verifiable. frameFit now reasons over real
// subsumption + disjointness, so the bind and the decline are checkable, not just plausible. Still-shimmed
// in the demo: the morphology lexis is name-synthesised (DKNP not built), and the Fandaws TERM map below is
// a small demo terminology (Fandaws proper not wired); the OCE firewall is not built, so proposals remain
// conjectures, never warrants. The APQC sample grounds to NO concept the law knows -> the Binder DECLINES.

// demo terminology: field-head -> a concept id that the compiled law carries (broader chains come from the
// law, the single source of truth). Fandaws would own this; here it is a small curated demo set.
const TERM = {
  driver: 'fan:Driver', operator: 'fan:Driver', pilot: 'fan:Driver', carrier: 'fan:Driver',
  truck: 'fan:Truck', vehicle: 'fan:Truck', transport: 'fan:Truck',
  origin: 'fan:City', source: 'fan:City', from: 'fan:City', city: 'fan:City',
  destination: 'fan:City', dest: 'fan:City', to: 'fan:City',
  ship: 'fan:Date', shipped: 'fan:Date', date: 'fan:Date', delivery: 'fan:Date', departure: 'fan:Date',
  goods: 'fan:Goods', cargo: 'fan:Goods', product: 'fan:Goods', item: 'fan:Goods' };

const concept = (id) => ({ id, broader: (LAW.subClassOf && LAW.subClassOf[id]) || [] });
function resolveTerm(label) { const id = TERM[String(label || '').toLowerCase()]; return id ? [concept(id)] : []; }

const SCOPE = {
  resolveTerm,
  getConcept: (id) => (id ? concept(id) : null),
  // a frame is retrieved only when the columns actually ground to concepts the law knows -- otherwise the
  // Binder gets no frame and honestly declines (BIND-001). This is what makes the APQC sample decline.
  retrieveFrames: (seed) => {
    const heads = (seed && seed.heads) || [];
    const grounded = heads.filter((h) => resolveTerm(h).length > 0).length;
    return grounded >= 2 ? Object.keys(LAW.frames || {}) : [];
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
