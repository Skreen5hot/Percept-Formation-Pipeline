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

  const residueFields = fields.map(f => f.fieldId).filter(id => !usedFields.has(id)).sort();

  const unfilledRoles = constitutiveRoleSlots(ctx.law, frameId)
    .map(s => s.role)
    .filter(r => !usedRoles.has(r))
    .sort();

  return { bindings, residueFields, unfilledRoles };
}
