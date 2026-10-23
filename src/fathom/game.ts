import { createClock } from '../engine/clock';
import { appendLog } from '../engine/log';
import { formatDuration, formatNumber } from '../engine/format';
import { createOutfit, type EntryKind, type Outfit } from './state';
import { tickOutfit } from './tick';
import { tickDeep, type DeepHunt } from './deep';

export const FATHOM_VERSION = 4;
const ABSENCE_NOTE_SECONDS = 60;

export interface FathomSettings {
  sound: boolean;
  reducedMotion: boolean;
}

export interface SeasonRecord {
  ending: string;
  bodyCount: number;
  depth: number;
  duration: number;
}

/** What survives a season. */
export interface FathomProfile {
  settings: FathomSettings;
  standing: number;
  notes: number;
  seasons: number;
  endingsSeen: string[];
  history: SeasonRecord[];
  /** Legend each horror has carried out of finished hunts (see docs/HORROR-TIER.md). */
  legend: Record<string, number>;
}

export interface FathomGame {
  version: number;
  savedAt: number;
  profile: FathomProfile;
  outfit: Outfit;
  /** Which side of the sonar is open: the season, or the Source. Only that side's time passes. */
  mode: 'season' | 'deep';
  deep: DeepHunt | null;
}

export function createFathomProfile(): FathomProfile {
  return { settings: { sound: false, reducedMotion: false }, standing: 0, notes: 0, seasons: 0, endingsSeen: [], history: [], legend: {} };
}

export function createFathomGame(seed: number, now: number): FathomGame {
  return { version: FATHOM_VERSION, savedAt: now, profile: createFathomProfile(), outfit: createOutfit(seed), mode: 'season', deep: null };
}

/** The Source runs several towns at once; away from the screen it steps coarsely to keep catch-up cheap. */
const DEEP_CATCH_UP_STEP_SECONDS = 5;

const clock = createClock<FathomGame>({
  tick: (game, dt) => (game.mode === 'deep' ? tickDeep(game, dt) : { ...game, outfit: tickOutfit(game.outfit, dt) }),
  step: (game) => (game.mode === 'deep' ? DEEP_CATCH_UP_STEP_SECONDS : 1),
  noteAway(before, after, seconds) {
    if (seconds < ABSENCE_NOTE_SECONDS || before.mode === 'deep') return after;
    const earned = after.outfit.lifetimeCash - before.outfit.lifetimeCash;
    const text = `WHILE YOU WERE ASHORE (${formatDuration(seconds)}): $${formatNumber(earned)} EARNED. ${after.outfit.bodyCount - before.outfit.bodyCount} LOST TO THE WATER.`;
    return { ...after, outfit: appendLog<EntryKind, Outfit>(after.outfit, 'sonar', text) };
  },
});

/** Called by the live loop with real elapsed seconds since the previous frame. */
export const advance = clock.advance;

/** Called on load: simulate the time since the last save. */
export const catchUp = clock.catchUp;
