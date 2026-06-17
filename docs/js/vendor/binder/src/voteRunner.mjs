import { CHANNEL_ORDER, channelVote } from './types.mjs';
import { morphology, lexical, structural, frameFit, topic } from './channels.mjs';

const VOTERS = { morphology, lexical, structural, frameFit, topic };

export function collectVotes(field, lexis, roleSlot, frameId, ctx) {
  return CHANNEL_ORDER.map(ch => VOTERS[ch](field, lexis, roleSlot, frameId, ctx));
}
