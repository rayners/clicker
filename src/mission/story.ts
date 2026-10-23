import type { LogKind } from './log';
import type { MissionState } from './state';
import type { StorySignals } from './kinds';
import type { Lexicon } from '../engine/lexicon';
import { runBeats as runShared, sinceBeat, type Beat as SharedBeat, type StoryEffect } from '../engine/story';

/** Seconds between non-urgent beats. */
export const STORY_MIN_GAP = 20;

/** What a mission knows about the wider game. Kept tiny so missions stay self-contained. */
export interface MissionContext {
  /** Contracts completed before this one. */
  cycle: number;
  /** Endings reached on previous contracts. */
  endings: readonly string[];
}

/** Horror-specific effects use { kind: 'action' } and are handed to the mission's horror. */
export type BeatEffect = StoryEffect;

/** What the composer hands the story engine: the scenario's signals and vocabulary, and the horror's effects. */
export interface StoryEnv {
  signals: StorySignals;
  lexicon: Lexicon;
  applyHorrorEffect(m: MissionState, action: string): MissionState;
}

const BARE_ENV: StoryEnv = {
  signals: { progress: 0, deepAccess: false },
  lexicon: {},
  applyHorrorEffect: (m) => m,
};

export type Beat = SharedBeat<{ m: MissionState; ctx: MissionContext; signals: StorySignals }, LogKind>;

export function runBeats<M extends MissionState>(m: M, beats: readonly Beat[], ctx: MissionContext, env: StoryEnv = BARE_ENV): M {
  return runShared<LogKind, MissionState, { m: MissionState; ctx: MissionContext; signals: StorySignals }>(
    m,
    beats,
    { m, ctx, signals: env.signals },
    { minGap: STORY_MIN_GAP, lexicon: env.lexicon, onAction: env.applyHorrorEffect },
  ) as M;
}

export { sinceBeat };
