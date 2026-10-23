import { appendLog, type LogHost } from './log';
import { interpolate, type Lexicon } from './lexicon';

/** Anything that tells a story: a log plus which beats have fired, the act, and story flags. */
export interface StoryHost<K extends string = string> extends LogHost<K> {
  act: number;
  /** Beat id -> elapsed time it fired. */
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
}

export type StoryEffect =
  | { kind: 'setAct'; act: number }
  | { kind: 'setFlag'; flag: string }
  /** Interpreted by the game (e.g. a horror's forced breach); ignored when nothing handles it. */
  | { kind: 'action'; action: string };

export interface Beat<A, K extends string = string> {
  id: string;
  /** Which act this content belongs to (documentation and tests); defaults to 1. */
  act?: number;
  when(args: A): boolean;
  entries: { kind: K; text: string }[];
  effects?: StoryEffect[];
  /** Fires without waiting for the usual gap after the previous beat. */
  urgent?: boolean;
}

export interface StoryOptions<H> {
  /** Seconds between non-urgent beats. */
  minGap: number;
  /** Fills {placeholders} in entry text. */
  lexicon?: Lexicon;
  onAction?(host: H, action: string): H;
}

function applyEffect<H extends StoryHost>(host: H, e: StoryEffect, options: StoryOptions<H>): H {
  switch (e.kind) {
    case 'setAct':
      return { ...host, act: Math.max(host.act, e.act) };
    case 'setFlag':
      return host.flags.includes(e.flag) ? host : { ...host, flags: [...host.flags, e.flag] };
    case 'action':
      return options.onAction ? options.onAction(host, e.action) : host;
  }
}

/** Fires at most one beat per call: the first eligible, in table order. */
export function runBeats<K extends string, H extends StoryHost<K>, A>(
  host: H,
  beats: readonly Beat<A, K>[],
  args: A,
  options: StoryOptions<H>,
): H {
  const spaced = host.lastBeatAt === null || host.elapsed - host.lastBeatAt >= options.minGap;
  const beat = beats.find((b) => host.beats[b.id] === undefined && (spaced || b.urgent) && b.when(args));
  if (!beat) return host;
  let next: H = { ...host, beats: { ...host.beats, [beat.id]: host.elapsed }, lastBeatAt: host.elapsed };
  for (const e of beat.entries) next = appendLog<K, H>(next, e.kind, options.lexicon ? interpolate(e.text, options.lexicon) : e.text);
  for (const e of beat.effects ?? []) next = applyEffect(next, e, options);
  return next;
}

/** Seconds since a beat fired, or -Infinity if it hasn't. */
export function sinceBeat(host: Pick<StoryHost, 'elapsed' | 'beats'>, id: string): number {
  const at = host.beats[id];
  return at === undefined ? -Infinity : host.elapsed - at;
}
