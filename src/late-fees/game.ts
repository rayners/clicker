import { createClock } from '../engine/clock';
import { appendLog } from '../engine/log';
import { formatDuration, formatNumber } from '../engine/format';
import { CAMP_CONFIG, createRun, type EntryKind, type KillerId, type Run, type VenueId } from './state';
import { tickRun } from './tick';
import { tickCut, type KillerCut } from './cut';

export const LATE_VERSION = 4;
const ABSENCE_NOTE_SECONDS = 60;

export interface LateSettings {
  sound: boolean;
  reducedMotion: boolean;
}

/** One finished film, kept forever on the franchise's record. */
export interface SequelRecord {
  venue: VenueId;
  killer: KillerId;
  title: string;
  ending: string;
  bodyCount: number;
  duration: number;
}

/** What survives a film: the franchise. */
export interface LateProfile {
  settings: LateSettings;
  /** Films finished. */
  sequels: number;
  /** Permanent income multiplier points. */
  boxOffice: number;
  /** What the survivors remember. */
  lore: number;
  endingsSeen: string[];
  history: SequelRecord[];
  /** Legend each killer has carried out of finished cuts (see docs/HORROR-TIER.md). */
  legend: Record<string, number>;
}

export interface LateGame {
  version: number;
  savedAt: number;
  profile: LateProfile;
  run: Run;
  /** The shelf is open: a tape is being chosen (new game, or the sequel after the credits). */
  shelf: boolean;
  /** Which side of the tape is playing: the films, or the Killer's Cut. Only that side's time passes. */
  mode: 'films' | 'cut';
  cut: KillerCut | null;
}

export function createLateProfile(): LateProfile {
  return { settings: { sound: false, reducedMotion: false }, sequels: 0, boxOffice: 0, lore: 0, endingsSeen: [], history: [], legend: {} };
}

/** A game already playing the first tape (tests, debug). */
export function createLateGame(seed: number, now: number): LateGame {
  return { version: LATE_VERSION, savedAt: now, profile: createLateProfile(), run: createRun(CAMP_CONFIG, seed), shelf: false, mode: 'films', cut: null };
}

/** What a new player sees: the shelf. */
export function newLateGame(seed: number, now: number): LateGame {
  return { ...createLateGame(seed, now), shelf: true };
}

/** The Killer's Cut runs three places at once; away from the screen it steps coarsely to keep catch-up cheap. */
const CUT_CATCH_UP_STEP_SECONDS = 5;

const clock = createClock<LateGame>({
  tick: (game, dt) => (game.mode === 'cut' ? tickCut(game, dt) : { ...game, run: tickRun(game.run, dt) }),
  step: (game) => (game.mode === 'cut' ? CUT_CATCH_UP_STEP_SECONDS : 1),
  // On the shelf, between films, nothing is playing.
  paused: (game) => game.mode !== 'cut' && game.shelf,
  noteAway(before, after, seconds) {
    if (seconds < ABSENCE_NOTE_SECONDS || before.mode === 'cut') return after;
    const takings = after.run.lifetimeCash - before.run.lifetimeCash;
    const dead = after.run.bodyCount - before.run.bodyCount;
    const text = `FAST-FORWARD ▶▶ ${formatDuration(seconds)}: $${formatNumber(takings)} TAKEN, ${formatNumber(dead)} DEAD.`;
    return { ...after, run: appendLog<EntryKind, Run>(after.run, 'osd', text) };
  },
});

/** Called by the live loop with real elapsed seconds since the previous frame. */
export const advance = clock.advance;

/** Called on load: simulate the time since the last save. */
export const catchUp = clock.catchUp;
