/**
 * @typedef {"string"|"number"|"integer"|"boolean"|"null"} Primitive
 */

/**
 * @typedef {Object} CISMRoot
 * @property {"1.3"} version
 * @property {string} generatedAt
 * @property {InferConfig} config
 * @property {SchemaNode} root
 * @property {Map<string, SchemaNode>} nodeIndex
 */

/**
 * @typedef {Object} SchemaNode
 * @property {string} id
 * @property {"object"|"array"|"primitive"|"union"} kind
 * @property {string} [name]
 * @property {number} occurrences
 * @property {SchemaEdge[]} [properties]
 * @property {SchemaNode|null} [itemType]
 * @property {Primitive} [primitiveType]
 * @property {boolean} [nullable]
 * @property {Partial<Record<Primitive, number>>} [typeDistribution]
 * @property {SchemaNode[]} [members]
 */

/**
 * @typedef {Object} SchemaEdge
 * @property {string} name
 * @property {SchemaNode} target
 * @property {boolean} required
 * @property {number} occurrences
 * @property {number} totalPopulation
 */

/**
 * @typedef {Object} InferConfig
 * @property {number} requiredThreshold
 * @property {boolean} emptyStringAsNull
 * @property {number} sampleSize
 * @property {"csv"|"json"} [format]
 * @property {number} maxSizeWarning
 */

/**
 * @typedef {Object} InferResult
 * @property {CISMRoot|null} cism
 * @property {Diagnostic[]} diagnostics
 */

/**
 * @typedef {Object} Diagnostic
 * @property {"info"|"warning"|"error"} level
 * @property {string} code
 * @property {string} message
 * @property {Record<string, unknown>} [context]
 */

/**
 * @typedef {Object} OutputAdapter
 * @property {string} name
 * @property {function(CISMRoot): unknown} project
 */

/**
 * @typedef {Object} AdapterRegistry
 * @property {function(OutputAdapter): void} register
 * @property {function(string): OutputAdapter|undefined} get
 * @property {function(): string[]} names
 */

/** Primitive types in widening-lattice order: null < boolean < integer < number < string (§8.2, §8.3). */
export const PRIMITIVE_TYPES = /** @type {Primitive[]} */ (
  ["null", "boolean", "integer", "number", "string"]
);

/** Numeric rank in the widening lattice; higher rank wins (§8.3). @type {Record<Primitive, number>} */
export const PRIMITIVE_RANK = { null: 0, boolean: 1, integer: 2, number: 3, string: 4 };

/** CISM spec version this build targets (§9.1). */
export const CISM_VERSION = "1.3";

/**
 * Default inference configuration (§13).
 * @type {InferConfig}
 */
export const DEFAULT_INFER_CONFIG = {
  requiredThreshold: 1.0,
  emptyStringAsNull: true,
  sampleSize: 2000,
  maxSizeWarning: 10485760,
  format: undefined,
};

/** Diagnostic code string constants (§12.1). */
export const DIAG = Object.freeze({
  BIBSS_001: "BIBSS-001",
  BIBSS_002: "BIBSS-002",
  BIBSS_003: "BIBSS-003",
  BIBSS_004: "BIBSS-004",
  BIBSS_005: "BIBSS-005",
  BIBSS_006: "BIBSS-006",
  BIBSS_007: "BIBSS-007",
  BIBSS_008: "BIBSS-008",
  BIBSS_009: "BIBSS-009",
});
