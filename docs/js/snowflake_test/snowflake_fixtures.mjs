// Snowflake-front fixtures (coordinator-authored GROUND TRUTH) -- the ship_info -> customer_dim hop.
// Carries: the EXTENDED SSM mapping (S3 -- ssm:dimensions[].ssm:outgoingFKs, shaped EXACTLY like a fact's
// ssm:roleAssignments + the genuinely-new ssm:nullable; concept DERIVED from the refTable's entityClass,
// never stored inline); the customer_dim candidates (resolveKey matches the FK value against businessKey);
// and the four named hop cases (resolved coreferent / resolved divergent / absent NULL / dangling orphan).
// The query carries the temporal window resolveKey reads. Faithful to the ssm.js conventions (ssm.js:19-54).

// A dimension candidate in the shape resolveKey consumes (krs.mjs:1 -- matches businessKey === fkValue, then
// validInstant cover + assertionHorizon). `content` is the resolved entity's row.
const C = (bk) => ({ id: bk, businessKey: bk, content: {}, validFrom: '2024-01-01', validTo: null, assertedAt: '2024-01-01' });

// customer_dim: only C1 and C2 are witnessed -> FK 9999 dangles (broken-ref), a NULL FK is absent.
export const dimsData = { customer_dim: [C('C1'), C('C2')] };

// The EXTENDED mapping (S3). ssm:-prefixed keys; ship_info carries ssm:outgoingFKs in the SAME shape as a
// fact's ssm:roleAssignments (ssm:fkColumn / ssm:refTable / ssm:role) + the genuinely-new ssm:nullable.
// concept is NOT stored inline -- it is derived from the entry's ssm:refTable -> that dim's ssm:entityClass.
export const mapping = {
  'ssm:dimensions': {
    ship_info: {
      'ssm:entityClass': 'fan:ShipInfo',
      'ssm:businessKey': 'ship_info_key',
      'ssm:outgoingFKs': [
        { 'ssm:fkColumn': 'customer_key', 'ssm:refTable': 'customer_dim', 'ssm:role': 'hasShipToParty', 'ssm:nullable': true },   // #1/#5/#6: the hop DESIGNATES the consignee (ICE -> Agent), not has-agent on a region
      ],
    },
    customer_dim: { 'ssm:entityClass': 'fan:Party', 'ssm:coType': 'cco:ont00001180', 'ssm:businessKey': 'customer_key' }, // a leaf: no outgoingFKs; #4 Party bearer + Organization co-type
  },
};

// The real star fact-FK convention (ssm.js:24), for the P-extra-S3 SAME-SHAPE discriminating check: an
// ssm:outgoingFKs entry must use the SAME field names as an ssm:roleAssignments entry (no parallel convention).
export const factRoleAssignmentSample = { 'ssm:fkColumn': 'customer_key', 'ssm:refTable': 'customer_dim', 'ssm:role': 'hasCustomer' };

export const subjectRefTable = 'ship_info';
export const subjectConcept = 'fan:ShipInfo';
export const query = { validInstant: '2024-06-01', assertionHorizon: '2026-01-01' };

// Each case: { subjectKey (the witnessed ship_info_key -> the intermediary IRI fdata:ShipInfo/<key>),
//              subjectRow (the resolved ShipInfo entity's row -- carries customer_key, the hop's sub-FK) }.
export const cases = {
  // hop-2 resolved, COREFERENT: ship_info.customer_key = C1 = the order's customer -> SAME node fdata:Customer/C1
  resolved_coreferent: { subjectKey: 'SI1', subjectRow: { customer_key: 'C1', ship_address: '1 Dock Rd' } },
  // hop-2 resolved, DIVERGENT: ship_info.customer_key = C2 (orderer is C1) -> DIFFERENT node fdata:Customer/C2
  resolved_divergent:  { subjectKey: 'SI9', subjectRow: { customer_key: 'C2', ship_address: '9 Wharf Ave' } },
  // hop-2 ABSENT: ship_info.customer_key = NULL -> NOTHING (no edge, no marker); ShipInfo survives
  absent:              { subjectKey: 'SI2', subjectRow: { customer_key: null, ship_address: '12 Dock Rd' } },
  // hop-2 DANGLING: ship_info.customer_key = 9999 (no customer_dim row) -> UnresolvedRole broken-ref; ShipInfo survives
  dangling:            { subjectKey: 'SI3', subjectRow: { customer_key: '9999', ship_address: '3 Pier St' } },
};
