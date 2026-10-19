import { appendLog, type LogKind } from './log';
import type { MissionState } from './state';
import { breach } from './containment';

/** Seconds between non-urgent beats. */
export const STORY_MIN_GAP = 20;

/** What a mission knows about the wider game. Kept tiny so missions stay self-contained. */
export interface MissionContext {
  /** Contracts completed before this one. */
  cycle: number;
}

export type BeatEffect = { kind: 'setAct'; act: number } | { kind: 'setFlag'; flag: string } | { kind: 'breach' };

export interface Beat {
  id: string;
  /** Which act this content belongs to (documentation and tests); defaults to 1. */
  act?: number;
  when(args: { m: MissionState; ctx: MissionContext }): boolean;
  entries: { kind: LogKind; text: string }[];
  effects?: BeatEffect[];
  /** Fires without waiting for the usual gap after the previous beat. */
  urgent?: boolean;
}

function applyEffect(m: MissionState, e: BeatEffect): MissionState {
  switch (e.kind) {
    case 'setAct':
      return { ...m, act: Math.max(m.act, e.act) };
    case 'setFlag':
      return m.flags.includes(e.flag) ? m : { ...m, flags: [...m.flags, e.flag] };
    case 'breach':
      return breach(m);
  }
}

export function runBeats(m: MissionState, beats: readonly Beat[], ctx: MissionContext): MissionState {
  const spaced = m.lastBeatAt === null || m.elapsed - m.lastBeatAt >= STORY_MIN_GAP;
  const beat = beats.find((b) => m.beats[b.id] === undefined && (spaced || b.urgent) && b.when({ m, ctx }));
  if (!beat) return m;
  let next: MissionState = { ...m, beats: { ...m.beats, [beat.id]: m.elapsed }, lastBeatAt: m.elapsed };
  for (const e of beat.entries) next = appendLog(next, e.kind, e.text);
  for (const e of beat.effects ?? []) next = applyEffect(next, e);
  return next;
}

/** Seconds since a beat fired, or -Infinity if it hasn't. */
export function sinceBeat(m: MissionState, id: string): number {
  const at = m.beats[id];
  return at === undefined ? -Infinity : m.elapsed - at;
}
