/** The organism horror's terminus choices. Scenario wording comes from the lexicon. */
export const ORGANISM_ENDINGS: Readonly<Record<string, { title: string; text: string }>> = {
  deliver: { title: '{deliverTitle}', text: '{deliverText}' },
  scuttle: { title: '{scuttleTitle}', text: '{scuttleText}' },
  broadcast: {
    title: 'BROADCAST 0-77',
    text: 'Transmit Special Order 0-77 and the full archive on every frequency, unencrypted. {broadcastTail} Let the Combine explain itself.',
  },
};
