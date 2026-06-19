import { VOTE, channelVote } from './types.mjs';
import { classifyFieldShape } from './fieldShape.mjs';
import { subsumes, relatumSatisfied } from './frameLaw.mjs';

function roleKeyword(role) {
  const stripped = role.replace(/^(has|uses|occupies)/, '');
  return stripped.toLowerCase();
}

export function morphology(field, lexis, roleSlot, frameId, ctx) {
  if (!lexis) return channelVote('morphology', VOTE.SILENT, null);
  const shape = classifyFieldShape(field, lexis);
  if (shape !== roleSlot.fillerKind) return channelVote('morphology', VOTE.DISAGREE, { shape, expected: roleSlot.fillerKind });
  const kw = roleKeyword(roleSlot.role);
  if (lexis.head && (lexis.head.toLowerCase().includes(kw) || kw.includes(lexis.head.toLowerCase()))) {
    return channelVote('morphology', VOTE.AGREE, { head: lexis.head, keyword: kw });
  }
  return channelVote('morphology', VOTE.SILENT, { head: lexis.head, keyword: kw });
}

export function lexical(field, lexis, roleSlot, frameId, ctx) {
  const c = (ctx.scope.resolveTerm(lexis && lexis.head) || [])[0];
  if (!c) return channelVote('lexical', VOTE.SILENT, null);
  const types = new Set([c.id]);
  const queue = [...(c.broader || [])];
  while (queue.length > 0) {
    const tid = queue.shift();
    if (types.has(tid)) continue;
    types.add(tid);
    const concept = ctx.scope.getConcept(tid);
    if (concept && concept.broader) queue.push(...concept.broader);
  }
  for (const type of types) {
    if (type === roleSlot.relatumType || subsumes(ctx.law, type, roleSlot.relatumType)) {
      return channelVote('lexical', VOTE.AGREE, { concept: c.id, relatumType: roleSlot.relatumType });
    }
  }
  return channelVote('lexical', VOTE.DISAGREE, { concept: c.id, relatumType: roleSlot.relatumType });
}

export function structural(field, lexis, roleSlot, frameId, ctx) {
  // CONCEPT-AWARE: the structural channel votes on the column's grounded CONCEPT satisfying the relatum
  // type, not on filler-SHAPE alone (shape-only AGREE was the spurious-foothold source -- e.g. ref_code).
  // No concept -> SILENT (no concept-basis; the correct neutral). classifyFieldShape is still computed for
  // evidence, and morphology still uses shape, so shape information is not lost.
  const shape = classifyFieldShape(field, lexis);
  const c = (ctx.scope.resolveTerm(lexis && lexis.head) || [])[0];
  if (!c) return channelVote('structural', VOTE.SILENT, { shape });
  if (relatumSatisfied(ctx.law, c.id, roleSlot.relatumType)) {
    return channelVote('structural', VOTE.AGREE, { shape, concept: c.id, relatumType: roleSlot.relatumType });
  }
  return channelVote('structural', VOTE.DISAGREE, { shape, concept: c.id, relatumType: roleSlot.relatumType });
}

export function frameFit(field, lexis, roleSlot, frameId, ctx) {
  if (!roleSlot.constitutive) return channelVote('frameFit', VOTE.SILENT, null);
  const c = (ctx.scope.resolveTerm(lexis && lexis.head) || [])[0];
  if (!c) return channelVote('frameFit', VOTE.SILENT, null);
  if (relatumSatisfied(ctx.law, c.id, roleSlot.relatumType)) {
    return channelVote('frameFit', VOTE.AGREE, { concept: c.id, relatumType: roleSlot.relatumType });
  }
  return channelVote('frameFit', VOTE.DISAGREE, { concept: c.id, relatumType: roleSlot.relatumType });
}

export function topic(field, lexis, roleSlot, frameId, ctx) {
  if (!ctx.context || !ctx.context.topicHint) return channelVote('topic', VOTE.SILENT, null);
  const hint = ctx.context.topicHint.toLowerCase();
  if (frameId.toLowerCase().includes(hint)) return channelVote('topic', VOTE.AGREE, { hint, frameId });
  const localName = frameId.includes(':') ? frameId.split(':').pop().toLowerCase() : frameId.toLowerCase();
  if (localName.includes(hint) || hint.includes(localName)) {
    return channelVote('topic', VOTE.AGREE, { hint, frameId });
  }
  return channelVote('topic', VOTE.SILENT, { hint, frameId });
}
