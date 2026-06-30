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
const D = (bk, content = {}) => ({ id: bk, businessKey: bk, content, validFrom: '2024-01-01', validTo: null, assertedAt: '2024-01-01' });
// A ship_info record carries its OWN declared FK value (customer_key) in content -- the snowflake hop reads it.
const SI = (bk, customer_key) => ({ id: bk, businessKey: bk, content: { customer_key }, validFrom: '2024-01-01', validTo: null, assertedAt: '2024-01-01' });
const DIMS = {
  customer_dim: [D('C1'), D('C2')], product_dim: [D('P1')], employee_dim: [D('E1')], supplier_dim: [D('SUP1')],
  shipper_dim: [D('SH1')],
  // ship_info -> customer_dim is the declared SNOWFLAKE hop (ship_info.customer_key, nullable). SI1 ship-to = the
  // orderer C1 (coreference); SI9 ship-to C2 (divergent); SI2 NULL (absent -> nothing); SI3 9999 (dangling).
  ship_info: [SI('SI1', 'C1'), SI('SI9', 'C2'), SI('SI2', null), SI('SI3', '9999')],
  // S7: each date_dim row carries its OWN witnessed date (DISTINCT values) so M can hang fan:dateValue on the
  // per-act fan:Date individual (Decision-D -- the source order_date was previously DROPPED).
  date_dim: [D('D-ORD', { date: '1996-07-04' }), D('D-REQ', { date: '1996-08-01' }), D('D-SHP', { date: '1996-07-10' })],
};
const RA = [
  { 'ssm:fkColumn': 'customer_key', 'ssm:refTable': 'customer_dim', 'ssm:role': 'hasOrderer' },   // #6: the orderer is the act's agent (has-agent-clean); split from the ship-to
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
  // #4 ROLE-AS-KIND re-grounding: every party node denotes an Agent BEARER (fan:Party subClassOf cco:Agent), the
  // only sound SHARED supertype. M co-types each node with its WITNESSED kind (ssm:coType, emitted in S6):
  // cco:ont00001180 Organization for customer/supplier/shipper, cco:ont00001262 Person for employee. The old
  // frozen kinds (fan:Customer/Supplier/Shipper/Employee) are RETIRED -- they were anti-rigid roles as rigid kinds.
  customer_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'customer_key' },
  product_dim: { 'ssm:entityClass': 'fan:Product', 'ssm:businessKey': 'product_key' },
  employee_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001262', 'ssm:businessKey': 'employee_key' },
  supplier_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'supplier_key' },
  shipper_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'shipper_key' },
  ship_info: {
    'ssm:entityClass': 'fan:ShipInfo', 'ssm:businessKey': 'ship_info_key',
    // SNOWFLAKE (S3): the dimension's OWN declared FK -- same field names as ssm:roleAssignments + the
    // genuinely-new ssm:nullable; the relatum concept is DERIVED from refTable -> ssm:entityClass (never inline).
    // #1/#5/#6: the hop is a DESIGNATION of the ICE (ship_info hasShipToParty -> consignee), NOT has-agent on a
    // region -- so the role is hasShipToParty; refTable stays customer_dim so the hop concept is fan:Party.
    'ssm:outgoingFKs': [
      { 'ssm:fkColumn': 'customer_key', 'ssm:refTable': 'customer_dim', 'ssm:role': 'hasShipToParty', 'ssm:nullable': true },
    ],
  },
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

// SNOWFLAKE: four clean orders (frame resolves) that differ ONLY in their ship_info hop outcome (the declared
// hop ship_info -> customer_dim). One sample exercises all four per-subject outcomes in the materialized graph;
// all four share orderer C1, so the graph coreferes the ship-to of SI1 with the orderer (one fdata:Customer/C1).
const ORDER_SF = (order_id, ship_info_key) => ({ ...ORDER_CLEAN, order_id, ship_info_key });

// The named star samples (each a {label, factRows} the UI can offer as a button), mirroring the raw samples.
export const STAR_SAMPLES = {
  clean: { label: 'Northwind order (resolves)', factRows: [ORDER_CLEAN] },
  ice: { label: 'Northwind order, missing order_date (ICE)', factRows: [ORDER_NO_ORDERDATE] },
  orphan: { label: 'Northwind order, orphan customer (excluded)', factRows: [ORDER_ORPHAN_CUST] },
  snowflake: { label: 'Northwind orders, snowflake ship_info -> customer hop', factRows: [
    ORDER_SF(10, 'SI1'),   // hop resolved, COREFERENT (ship-to = orderer C1)
    ORDER_SF(11, 'SI9'),   // hop resolved, DIVERGENT (ship-to C2)
    ORDER_SF(12, 'SI2'),   // hop ABSENT (customer_key NULL) -> nothing
    ORDER_SF(13, 'SI3'),   // hop DANGLING (customer_key 9999) -> UnresolvedRole
  ] },
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
