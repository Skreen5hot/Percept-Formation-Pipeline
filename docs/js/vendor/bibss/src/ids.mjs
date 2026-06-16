/**
 * RFC 6901 JSON Pointer ID utilities and diagnostic factory (§9.2, §12.1).
 * Dependency-free; runs in browser and Node.
 */

/**
 * Escape one JSON Pointer segment per RFC 6901 §3 (§9.2.1):
 *   ~ → ~0  then  / → ~1  (tilde must precede slash to avoid double-encoding).
 * @param {string} segment
 * @returns {string}
 */
export function escapePointerSegment(segment) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Root node ID (§9.2.2). @returns {"#"} */
export function makeRootId() {
  return "#";
}

/**
 * ID for a named object-property child (§9.2.2).
 * @param {string} parentId
 * @param {string} propertyName  unescaped key
 * @returns {string}
 */
export function makeObjectChildId(parentId, propertyName) {
  return parentId + "/" + escapePointerSegment(propertyName);
}

/**
 * ID for an array's item schema (§9.2.2).
 * @param {string} parentId
 * @returns {string}
 */
export function makeArrayItemId(parentId) {
  return parentId + "/[]";
}

/**
 * ID for the i-th union member (§9.2.2).
 * @param {string} parentId
 * @param {number} index  zero-based
 * @returns {string}
 */
export function makeUnionMemberId(parentId, index) {
  return parentId + "/|" + index;
}

/**
 * Construct a Diagnostic object (§12.1).
 * @param {"info"|"warning"|"error"} level
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 * @returns {import('./types.mjs').Diagnostic}
 */
export function makeDiagnostic(level, code, message, context) {
  const d = { level, code, message };
  if (context !== undefined) d.context = context;
  return d;
}
