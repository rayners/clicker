import type { Beat } from '../shared/story';
import type { Lexicon } from '../shared/lexicon';
import type { EntryKind, Run, RunConfig } from './state';

/** What a venue tells the story and the killer about itself. Killers read only this, never venue state. */
export interface Signals {
  /** Shared story scale (DEEP CONTRACT's metres): 1,000 opens act 2, 3,200 with deep access the final girl. */
  progress: number;
  /** The venue's furthest reaches are open, so the final girl can find what lies there. */
  deep: boolean;
  /** People are asleep, alone, in the dark: when killers walk. */
  night: boolean;
}

export interface StoryArgs {
  r: Run;
  signals: Signals;
}

export type RunBeat = Beat<StoryArgs, EntryKind>;

/** Everything a killer may ask of whichever venue it is haunting. */
export interface KillHooks {
  /** The venue gives up one of its people; null if there is nobody to take. */
  claim(r: Run, roll: () => number): { r: Run; victim: string } | null;
  /** The venue's words, for the killer's own log lines. */
  lexicon: Lexicon;
}

/** Where you work and what the business is: the economy, the opening act and its words. */
export interface VenueDef {
  id: string;
  fields(config: RunConfig): object;
  boot(config: RunConfig): string[];
  tick(r: Run, dt: number): Run;
  signals(r: Run): Signals;
  lexicon: Lexicon;
  beats: readonly RunBeat[];
  claim: KillHooks['claim'];
  /** The headline figure for the sequel record. */
  outcome(r: Run): { output: number; unit: string };
  /** Who is still alive when the credits roll. */
  stakes(r: Run): string;
  /** How the business ends, whatever hunted there: selling up, or burning the place down. */
  endings: Readonly<Record<'sell' | 'burn', EndingText>>;
}

export interface EndingText {
  title: string;
  text: string;
}

export type Ending = 'kill' | 'sell' | 'burn';

/** What hunts there. Knows venues only through signals, the lexicon and the hooks. */
export interface KillerDef {
  id: string;
  name: string;
  fields(): object;
  tick(r: Run, dt: number, hooks: KillHooks, signals: Signals): Run;
  beats: readonly RunBeat[];
  /** How hard it pushes back on ground the venue holds (1 = an ordinary night). */
  pressure(r: Run, signals: Signals): number;
  /** How this killer is stopped (for now), wherever it was. */
  endings: Readonly<Record<'kill', EndingText>>;
}
