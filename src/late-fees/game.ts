import { appendLog } from '../shared/log';
import { formatDuration, formatNumber } from '../shared/format';
import { CAMP_CONFIG, createRun, type EntryKind, type KillerId, type Run, type VenueId } from './state';
import { tickRun } from './tick';
import { tickCut, type KillerCut } from './cut';

export const LATE_VERSION = 4;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 1;
/** Frame gaps longer than this are treated as the player having been away. */
const LIVE_MAX_DT = 2;
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

function simulate(game: LateGame, seconds: number): LateGame {
  if (game.mode === 'cut') {
    let g = game;
    const step = seconds > LIVE_MAX_DT ? CUT_CATCH_UP_STEP_SECONDS : seconds;
    for (let left = seconds; left > 0; left -= step) g = tickCut(g, Math.min(step, left));
    return g;
  }
  if (game.shelf) return game;
  let run = game.run;
  for (let left = seconds; left > 0; left -= CATCH_UP_STEP_SECONDS) run = tickRun(run, Math.min(CATCH_UP_STEP_SECONDS, left));
  return { ...game, run };
}

function away(game: LateGame, gap: number): LateGame {
  const seconds = Math.min(gap, OFFLINE_CAP_SECONDS);
  const g = simulate(game, seconds);
  if (g === game || seconds < ABSENCE_NOTE_SECONDS || game.mode === 'cut') return g;
  const takings = g.run.lifetimeCash - game.run.lifetimeCash;
  const dead = g.run.bodyCount - game.run.bodyCount;
  const text = `FAST-FORWARD ▶▶ ${formatDuration(seconds)}: $${formatNumber(takings)} TAKEN, ${formatNumber(dead)} DEAD.`;
  return { ...g, run: appendLog<EntryKind, Run>(g.run, 'osd', text) };
}

export function advance(game: LateGame, dt: number): LateGame {
  return dt <= LIVE_MAX_DT ? simulate(game, dt) : away(game, dt);
}

export function catchUp(game: LateGame, now: number): LateGame {
  const gap = (now - game.savedAt) / 1000;
  if (gap <= 0) return game;
  return { ...away(game, gap), savedAt: now };
}
