// §7.3, §8.3 — Type widening lattice, integer detection, and fold resolver
import { PRIMITIVE_RANK } from "./types.mjs";

export function isInteger(v) {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

export function hasNullType(types) {
  if (!types || types.length === 0) return false;
  return types.some(t => t === "null" || t === null);
}

export function resolveTwo(typeA, typeB) {
  const a = typeA === null ? "null" : typeA;
  const b = typeB === null ? "null" : typeB;
  if (a === "null" && b === "null") return { type: "null", nullable: true };
  if (a === "null") return { type: b, nullable: true };
  if (b === "null") return { type: a, nullable: true };
  const winner = PRIMITIVE_RANK[a] >= PRIMITIVE_RANK[b] ? a : b;
  return { type: winner, nullable: false };
}

export function foldResolve(types) {
  if (!types || types.length === 0) return { type: "null", nullable: false };
  const normalized = types.map(t => (t === null) ? "null" : t);
  const nonNull = normalized.filter(t => t !== "null");
  const nullable = nonNull.length < normalized.length;
  if (nonNull.length === 0) return { type: "null", nullable: true };
  let resolved = nonNull[0];
  for (let i = 1; i < nonNull.length; i++) {
    const r = resolveTwo(resolved, nonNull[i]);
    resolved = r.type;
  }
  return { type: resolved, nullable };
}
