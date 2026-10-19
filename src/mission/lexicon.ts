/** Named phrases a scenario supplies so horror text can be written once and fit any scenario. */
export type Lexicon = Readonly<Record<string, string>>;

const PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

export function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]!);
}

/** Unknown keys are left visible rather than silently dropped, so gaps show up in tests and play. */
export function interpolate(text: string, lexicon: Lexicon): string {
  return text.replace(PLACEHOLDER, (whole, key: string) => lexicon[key] ?? whole);
}
