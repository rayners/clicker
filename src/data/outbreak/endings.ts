/** The outbreak horror's terminus choices: what to do with the strain. */
export const OUTBREAK_ENDINGS: Readonly<Record<string, { title: string; text: string }>> = {
  deliver: {
    title: 'SHIP THE SAMPLES',
    text: 'Seal the cultures in cryo and send them on to Bioproducts. The turned crew travel with them, retained for study. Nobody is treated.',
  },
  scuttle: {
    title: 'BURN THE CULTURES',
    text: 'Sterilise everything: the tanks, the wards, the sick bay and everyone in it. Survivors leave under a quarantine beacon. Bioproducts receives nothing.',
  },
  broadcast: {
    title: 'BROADCAST DIRECTIVE 11',
    text: 'Transmit Directive 11, the Wellness memos and the strain\'s sequence on every frequency, unencrypted. {broadcastTail} Let the Combine explain itself.',
  },
};
