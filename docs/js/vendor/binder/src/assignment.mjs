import { collectVotes } from './voteRunner.mjs';
import { bindingConfidence, agreeCount } from './scoring.mjs';
import { frameRoleSlots, constitutiveRoleSlots } from './frameLaw.mjs';
import { classifyFieldShape } from './fieldShape.mjs';

export function assignRoles(frameId, fields, lexisMap, ctx) {
  const roleSlots = frameRoleSlots(ctx.law, frameId);

  const candidates = [];
  for (const field of fields) {
    const lexis = lexisMap[field.fieldId] || { head: '', markers: [] };
    const resolved = ctx.scope.resolveTerm(lexis.head);
    const relatumConcept = (resolved && resolved.length > 0) ? resolved[0].id : null;
    const fillerKind = classifyFieldShape(field, lexis);

    for (const roleSlot of roleSlots) {
      const votes = collectVotes(field, lexis, roleSlot, frameId, ctx);
      candidates.push({
        fieldId: field.fieldId,
        role: roleSlot.role,
        relatumConcept,
        fillerKind,
        votes,
        bindingConfidence: bindingConfidence(votes),
        agreeCount: agreeCount(votes),
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.bindingConfidence !== a.bindingConfidence) return b.bindingConfidence - a.bindingConfidence;
    if (b.agreeCount !== a.agreeCount) return b.agreeCount - a.agreeCount;
    if (a.role < b.role) return -1;
    if (a.role > b.role) return 1;
    if (a.fieldId < b.fieldId) return -1;
    if (a.fieldId > b.fieldId) return 1;
    return 0;
  });

  const usedRoles = new Set();
  const usedFields = new Set();
  const bindings = [];

  for (const c of candidates) {
    if (!usedRoles.has(c.role) && !usedFields.has(c.fieldId) && c.bindingConfidence > 0) {
      usedRoles.add(c.role);
      usedFields.add(c.fieldId);
      bindings.push(c);
    }
  }

  // OPTION A -- EXPLICIT FORCING. After the greedy > 0 pass, any still-unfilled CONSTITUTIVE role is FORCED
  // to take its least-bad remaining residue candidate even at bindingConfidence 0, so OCE can adjudicate the
  // violation (rather than the role going EMPTY -> INCOMPLETE -- which would hollow the forced-error catch).
  // "Least-bad" is the SAME deterministic tiebreak the candidate sort already uses (bindingConfidence desc,
  // agreeCount desc, role, fieldId): `candidates` is already sorted that way, so the FIRST eligible candidate
  // for an unfilled constitutive role is by construction the byte-stable, order-independent least-bad choice.
  const constitutiveRoles = new Set(constitutiveRoleSlots(ctx.law, frameId).map(s => s.role));
  for (const c of candidates) {
    if (!constitutiveRoles.has(c.role)) continue;
    if (usedRoles.has(c.role) || usedFields.has(c.fieldId)) continue;
    // GROUNDED-ONLY: only force residues with a resolved concept. An ungrounded column
    // (relatumConcept == null) has no concept to subsume and no axiom to violate, so forcing
    // it would assert a binding over an absence (a role-XOR contradiction). Leave it as residue.
    if (c.relatumConcept == null) continue;
    usedRoles.add(c.role);
    usedFields.add(c.fieldId);
    bindings.push(c);
  }

  const residueFields = fields.map(f => f.fieldId).filter(id => !usedFields.has(id)).sort();

  const unfilledRoles = constitutiveRoleSlots(ctx.law, frameId)
    .map(s => s.role)
    .filter(r => !usedRoles.has(r))
    .sort();

  return { bindings, residueFields, unfilledRoles };
}
