export const CHANNEL_ORDER = ['morphology','lexical','structural','frameFit','topic'];
export const VOTE = { AGREE:'agree', DISAGREE:'disagree', SILENT:'silent' };
export const FILLER = { REFERENCE:'reference', LITERAL:'literal' };
export function channelVote(channel, vote, evidence) {
  return { 'bind:channel': channel, 'bind:vote': vote, 'bind:evidence': String(evidence || '') };
}
