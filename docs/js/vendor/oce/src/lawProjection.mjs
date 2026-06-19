import { roleSlots, constitutiveLocals, accidentalLocals } from './lawAdapter.mjs';
import { supers, subsumes, propertyByLocal } from './lawAdapter.mjs';
import { localName } from './types.mjs';

// Concept-scoped law projection (finding (b), firewall-grade): a frame's lawHash must depend ONLY on its OWN
// law, so one frame's law change cannot contaminate another frame's content address. We compute the frame's
// OWN-LAW fragment by an explicit closure (NOT the whole law maps):
//   SEED  = { concept } U { each role's relatumType } U { inherence bearers reachable from a role's relatumType }
//   C     = subClassOf-UPWARD closure of SEED (x + supers(x)); disjointWith edges are NOT traversed to grow C
//   subClassOf_own  = subClassOf restricted to keys in C
//   disjointWith_own = disjointWith[k] (k in C) FILTERED to partners ALSO in C
//   properties_own  = the properties the frame adjudicates (rcr constitutive U accidental) + inherence props
// project() feeds ONLY oce:lawHash (assemble()); the verdict path reads the live law, so this is verdict-neutral.
export function project(law, concept) {
  const subClassOf = (law && law.subClassOf) || {};
  const disjointWith = (law && law.disjointWith) || {};
  const properties = (law && law.properties) || {};
  const rcr = (law && law.rcr) || {};
  // A safe law view for the adapter calls (supers/subsumes/roleSlots read subClassOfClosure/frames) so the
  // null/empty-concept + bare-law paths (project(law,'') in adjudicate.mjs) never throw.
  const safeLaw = {
    subClassOfClosure: (law && law.subClassOfClosure) || {},
    disjointWith,
    frames: (law && law.frames) || {},
    properties,
  };

  const roles = roleSlots(safeLaw, concept);

  // --- SEED ---
  const seed = new Set();
  if (concept) seed.add(concept);
  const relatumTypes = [];
  for (const r of roles) {
    if (r && r.relatumType) { seed.add(r.relatumType); relatumTypes.push(r.relatumType); }
  }

  // inherence bearers: a property P with inherenceNecessity===true whose DOMAIN subsumes some role's
  // relatumType pulls its requiredBearer into the seed (and its property into properties_own).
  const inherenceProps = [];
  for (const fullKey of Object.keys(properties)) {
    const P = properties[fullKey];
    if (!P || P.inherenceNecessity !== true) continue;
    const domain = P.domain;
    let applies = false;
    for (const rt of relatumTypes) {
      if (domain && subsumes(safeLaw, rt, domain)) { applies = true; break; }
    }
    if (applies) {
      if (P.requiredBearer) seed.add(P.requiredBearer);
      inherenceProps.push(fullKey);
    }
  }

  // --- CLOSURE C: subClassOf-UPWARD only (do NOT traverse disjointWith) ---
  const C = new Set();
  for (const x of seed) {
    for (const up of supers(safeLaw, x)) C.add(up); // supers() includes x itself
  }

  // --- subClassOf_own: keys in C ---
  const subClassOf_own = {};
  for (const k of C) {
    if (Object.hasOwn(subClassOf, k)) subClassOf_own[k] = subClassOf[k];
  }

  // --- disjointWith_own: keys in C, partners filtered to ALSO be in C ---
  const disjointWith_own = {};
  for (const k of C) {
    if (!Object.hasOwn(disjointWith, k)) continue;
    const partners = disjointWith[k].filter((p) => C.has(p));
    if (partners.length) disjointWith_own[k] = partners;
  }

  // --- properties_own: the props the frame ADJUDICATES (rcr constitutive U accidental) + inherence props ---
  const conceptRcr = Object.hasOwn(rcr, concept) ? rcr[concept] : null;
  const adjudicatedLocals = [
    ...((conceptRcr && conceptRcr.constitutive) || []),
    ...((conceptRcr && conceptRcr.accidental) || []),
  ].map(localName);

  const ownKeys = new Set();
  for (const local of adjudicatedLocals) {
    const prop = propertyByLocal(safeLaw, local);
    if (!prop) continue;
    // resolve back to the full key (propertyByLocal returns the value; find its key by localName)
    for (const fullKey of Object.keys(properties)) {
      if (localName(fullKey) === local) { ownKeys.add(fullKey); break; }
    }
  }
  for (const fullKey of inherenceProps) ownKeys.add(fullKey);

  const properties_own = {};
  for (const fullKey of ownKeys) {
    if (Object.hasOwn(properties, fullKey)) properties_own[fullKey] = properties[fullKey];
  }

  return {
    concept,
    roles,
    rcr: (law && law.rcr && law.rcr[concept]) || null,
    subClassOf: subClassOf_own,
    disjointWith: disjointWith_own,
    properties: properties_own,
  };
}
