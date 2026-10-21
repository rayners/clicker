import { appendLog } from '../shared/log';
import { formatDuration, formatNumber } from '../shared/format';
import { createOutfit, type EntryKind, type Outfit } from './state';
import { tickOutfit } from './tick';

export const FATHOM_VERSION = 1;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 1;
/** Frame gaps longer than this are treated as the player having been away. */
const LIVE_MAX_DT = 2;
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
}

export interface FathomGame {
  version: number;
  savedAt: number;
  profile: FathomProfile;
  outfit: Outfit;
}

export function createFathomProfile(): FathomProfile {
  return { settings: { sound: false, reducedMotion: false }, standing: 0, notes: 0, seasons: 0, endingsSeen: [], history: [] };
}

export function createFathomGame(seed: number, now: number): FathomGame {
  return { version: FATHOM_VERSION, savedAt: now, profile: createFathomProfile(), outfit: createOutfit(seed) };
}

function simulate(game: FathomGame, seconds: number): FathomGame {
  let outfit = game.outfit;
  for (let left = seconds; left > 0; left -= CATCH_UP_STEP_SECONDS) outfit = tickOutfit(outfit, Math.min(CATCH_UP_STEP_SECONDS, left));
  return { ...game, outfit };
}

function away(game: FathomGame, gap: number): FathomGame {
  const seconds = Math.min(gap, OFFLINE_CAP_SECONDS);
  const g = simulate(game, seconds);
  if (seconds < ABSENCE_NOTE_SECONDS) return g;
  const earned = g.outfit.lifetimeCash - game.outfit.lifetimeCash;
  const text = `WHILE YOU WERE ASHORE (${formatDuration(seconds)}): $${formatNumber(earned)} EARNED. ${g.outfit.bodyCount - game.outfit.bodyCount} LOST TO THE WATER.`;
  return { ...g, outfit: appendLog<EntryKind, Outfit>(g.outfit, 'sonar', text) };
}

/** Called by the live loop with real elapsed seconds since the previous frame. */
export function advance(game: FathomGame, dt: number): FathomGame {
  return dt <= LIVE_MAX_DT ? simulate(game, dt) : away(game, dt);
}

/** Called on load: simulate the time since the last save. */
export function catchUp(game: FathomGame, now: number): FathomGame {
  const gap = (now - game.savedAt) / 1000;
  if (gap <= 0) return game;
  return { ...away(game, gap), savedAt: now };
}
