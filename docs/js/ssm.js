// SSM (Structured-Source Mapping) demo adapter -- the PFP STRUCTURED-SOURCE FRONT, added alongside the raw
// CSV/JSON front. Where SNP->BIBSS->SAS form a percept from raw bytes, the SSM front forms it from an
// ALREADY-STRUCTURED source (a star schema: a fact table + dimension tables + a hand-ratified mapping). It
// resolves each foreign key to its dimension row, binds it to a role, and hands the resulting flat frame to
// the SAME shared Binder->OCE->FSDD core the raw front uses -- producing the SAME Adjudication Manifest.
//
// REUSE, NOT RE-IMPLEMENT (G-VENDOR): integrate() (vendor/ssm) composes the shared vendor/{oce,fsdd,binder}.
// The proof-of-reuse smoke (vendor/ssm/test/capstone.smoke.mjs) reproduces the Phase-2 capstone's 205/0
// ground truth against this exact vendored core. Nothing downstream of the SSM front is new or modified.

import { integrate } from './vendor/ssm/src/integrate.mjs';
import LAW from './vendor/law/actofordering_law.mjs';
import { canonicalize } from './vendor/fsdd/src/jcs.mjs';
import { stripToStandards } from './vendor/fsdd/src/standardsPure.mjs';

// A representative Northwind warehouse star: orders_fact (a 9-role star -- date_dim is role-played x3:
// orderOccupies CONSTITUTIVE vs required/shippedOccupies ACCIDENTAL) adjudicated against the REAL compiled
// fan:ActOfOrdering law (the signed Phase-2 partition). Surrogate keys; business keys carried as attributes.
const D = (bk) => ({ id: bk, businessKey: bk, content: {}, validFrom: '2024-01-01', validTo: null, assertedAt: '2024-01-01' });
const DIMS = {
  customer_dim: [D('C1')], product_dim: [D('P1')], employee_dim: [D('E1')], supplier_dim: [D('SUP1')],
  shipper_dim: [D('SH1')], ship_info: [D('SI1')], date_dim: [D('D-ORD'), D('D-REQ'), D('D-SHP')],
};
const RA = [
  { 'ssm:fkColumn': 'customer_key', 'ssm:refTable': 'customer_dim', 'ssm:role': 'hasCustomer' },
  { 'ssm:fkColumn': 'product_key', 'ssm:refTable': 'product_dim', 'ssm:role': 'hasProduct' },
  { 'ssm:fkColumn': 'order_date_key', 'ssm:refTable': 'date_dim', 'ssm:role': 'orderOccupies' },
  { 'ssm:fkColumn': 'employee_key', 'ssm:refTable': 'employee_dim', 'ssm:role': 'hasEmployee' },
  { 'ssm:fkColumn': 'supplier_key', 'ssm:refTable': 'supplier_dim', 'ssm:role': 'hasSupplier' },
  { 'ssm:fkColumn': 'shipper_key', 'ssm:refTable': 'shipper_dim', 'ssm:role': 'hasShipper' },
  { 'ssm:fkColumn': 'ship_info_key', 'ssm:refTable': 'ship_info', 'ssm:role': 'hasShipInfo' },
  { 'ssm:fkColumn': 'required_date_key', 'ssm:refTable': 'date_dim', 'ssm:role': 'requiredOccupies' },
  { 'ssm:fkColumn': 'shipped_date_key', 'ssm:refTable': 'date_dim', 'ssm:role': 'shippedOccupies' },
];
const DIMDEFS = {
  customer_dim: { 'ssm:entityClass': 'fan:Customer', 'ssm:businessKey': 'customer_key' },
  product_dim: { 'ssm:entityClass': 'fan:Product', 'ssm:businessKey': 'product_key' },
  employee_dim: { 'ssm:entityClass': 'fan:Employee', 'ssm:businessKey': 'employee_key' },
  supplier_dim: { 'ssm:entityClass': 'fan:Supplier', 'ssm:businessKey': 'supplier_key' },
  shipper_dim: { 'ssm:entityClass': 'fan:Shipper', 'ssm:businessKey': 'shipper_key' },
  ship_info: { 'ssm:entityClass': 'fan:ShipInfo', 'ssm:businessKey': 'ship_info_key' },
  date_dim: { 'ssm:entityClass': 'fan:Date', 'ssm:businessKey': 'date_key' },
};
const SSM_MAPPING = {
  'ssm:source': { 'ssm:systemName': 'northwind_dw' },
  'ssm:facts': { 'orders_fact': { 'ssm:recordConcept': 'fan:ActOfOrdering', 'ssm:roleAssignments': RA } },
  'ssm:dimensions': DIMDEFS,
};
const COLS = ['customer_key', 'product_key', 'order_date_key', 'employee_key', 'supplier_key', 'shipper_key', 'ship_info_key', 'required_date_key', 'shipped_date_key', 'order_id'];
const SCHEMA = { 'viz:rawInputHash': 'sha256:northwind_dw', 'viz:hasField': COLS.map((c) => ({ fieldId: `viz:field/${c}`, 'viz:fieldName': c })) };
const CISM = { fields: COLS.map((c) => ({ field: c, primitiveType: c === 'order_id' ? 'integer' : 'string', typeDistribution: { [c === 'order_id' ? 'integer' : 'string']: 1 } })) };
const SCOPE = { resolveTerm: () => [], getConcept: () => null, retrieveFrames: () => ['fan:ActOfOrdering'] };
const LEXIS = Object.fromEntries(COLS.map((c) => [`viz:field/${c}`, { head: c.replace(/_key$|_id$/, ''), markers: ['key'] }]));
const QUERY = { validInstant: '2024-06-01', assertionHorizon: '2026-01-01' };

// The fact rows. A clean order resolves all 9 roles; the honesty-ladder variants demonstrate the section-1.3
// distinctions the manifest must keep (resolved vs ICE vs whole-frame exclusion) -- the same "each sample is
// one point on the honesty ladder" pattern the raw-front samples follow.
const ORDER_CLEAN = { order_id: 1, customer_key: 'C1', product_key: 'P1', order_date_key: 'D-ORD', employee_key: 'E1', supplier_key: 'SUP1', shipper_key: 'SH1', ship_info_key: 'SI1', required_date_key: 'D-REQ', shipped_date_key: 'D-SHP' };
const ORDER_NO_ORDERDATE = { ...ORDER_CLEAN, order_id: 2, order_date_key: null };       // CONSTITUTIVE NULL -> ICE
const ORDER_ORPHAN_CUST = { ...ORDER_CLEAN, order_id: 3, customer_key: 'C-ORPHAN' };     // CONSTITUTIVE dangling -> exclusion

// The named star samples (each a {label, factRows} the UI can offer as a button), mirroring the raw samples.
export const STAR_SAMPLES = {
  clean: { label: 'Northwind order (resolves)', factRows: [ORDER_CLEAN] },
  ice: { label: 'Northwind order, missing order_date (ICE)', factRows: [ORDER_NO_ORDERDATE] },
  orphan: { label: 'Northwind order, orphan customer (excluded)', factRows: [ORDER_ORPHAN_CUST] },
};

// The fixed Northwind star bundle (everything but the fact rows, which the chosen sample supplies).
export const STAR_NORTHWIND = {
  ssm: SSM_MAPPING, dimsData: DIMS, law: LAW, scope: SCOPE, lexis: LEXIS, schema: SCHEMA, cism: CISM,
  query: QUERY, envelope: { 'dcterms:title': 'Northwind DW (orders_fact)', agent: { '@id': 'hiri:agent/pfp-demo' } },
};

// Run the SSM front: resolve FKs, bind roles, hand the flat frame to the shared Binder->OCE->FSDD core.
// Returns integrate()'s native shape: { results:[per-row], relationships, derivedArtifacts }.
export function resolveStar(factRows) {
  return integrate({ ...STAR_NORTHWIND, factRows });
}

// Wrap a per-row emit() dictionary into the shape the existing FSDD panel renders (the same {ok, dictionary,
// canonical, standardsPureCanonical} buildDictionary() produces) -- so the star path reuses the panel
// verbatim, and the download re-hashes to the canonical bytes exactly as the raw path's does.
export function wrapForFsddPanel(rowResult) {
  if (!rowResult || !rowResult.dictionary) return { ok: false };
  const dictionary = rowResult.dictionary;
  return {
    ok: true,
    dictionary,
    canonical: canonicalize(dictionary),
    standardsPureCanonical: canonicalize(stripToStandards(dictionary)),
  };
}
