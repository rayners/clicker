import { appendLog, type LogKind } from './log';
import type { MissionState } from './state';
import type { StorySignals } from './kinds';
import { interpolate, type Lexicon } from './lexicon';

/** Seconds between non-urgent beats. */
export const STORY_MIN_GAP = 20;

/** What a mission knows about the wider game. Kept tiny so missions stay self-contained. */
export interface MissionContext {
  /** Contracts completed before this one. */
  cycle: number;
  /** Endings reached on previous contracts. */
  endings: readonly string[];
}

export type BeatEffect =
  | { kind: 'setAct'; act: number }
  | { kind: 'setFlag'; flag: string }
  /** Interpreted by the mission's horror; ignored by horrors that don't know it. */
  | { kind: 'horror'; action: string };

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

export interface Beat {
  id: string;
  /** Which act this content belongs to (documentation and tests); defaults to 1. */
  act?: number;
  when(args: { m: MissionState; ctx: MissionContext; signals: StorySignals }): boolean;
  entries: { kind: LogKind; text: string }[];
  effects?: BeatEffect[];
  /** Fires without waiting for the usual gap after the previous beat. */
  urgent?: boolean;
}

function applyEffect(m: MissionState, e: BeatEffect, env: StoryEnv): MissionState {
  switch (e.kind) {
    case 'setAct':
      return { ...m, act: Math.max(m.act, e.act) };
    case 'setFlag':
      return m.flags.includes(e.flag) ? m : { ...m, flags: [...m.flags, e.flag] };
    case 'horror':
      return env.applyHorrorEffect(m, e.action);
  }
}

export function runBeats<M extends MissionState>(m: M, beats: readonly Beat[], ctx: MissionContext, env: StoryEnv = BARE_ENV): M {
  const spaced = m.lastBeatAt === null || m.elapsed - m.lastBeatAt >= STORY_MIN_GAP;
  const signals = env.signals;
  const beat = beats.find((b) => m.beats[b.id] === undefined && (spaced || b.urgent) && b.when({ m, ctx, signals }));
  if (!beat) return m;
  let next: MissionState = { ...m, beats: { ...m.beats, [beat.id]: m.elapsed }, lastBeatAt: m.elapsed };
  for (const e of beat.entries) next = appendLog(next, e.kind, interpolate(e.text, env.lexicon));
  for (const e of beat.effects ?? []) next = applyEffect(next, e, env);
  return next as M;
}

/** Seconds since a beat fired, or -Infinity if it hasn't. */
export function sinceBeat(m: MissionState, id: string): number {
  const at = m.beats[id];
  return at === undefined ? -Infinity : m.elapsed - at;
}
