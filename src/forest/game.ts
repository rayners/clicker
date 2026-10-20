import { appendLog } from '../shared/log';
import { formatDuration, formatNumber } from '../shared/format';
import { tickCompany } from './company';
import { createCompany, type Company, type EntryKind } from './state';

export const FOREST_VERSION = 2;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 1;
/** Frame gaps longer than this are treated as the player having been away. */
const LIVE_MAX_DT = 2;
const ABSENCE_NOTE_SECONDS = 60;

export interface ForestSettings {
  sound: boolean;
  reducedMotion: boolean;
}

export interface CharterRecord {
  ending: string;
  relics: number;
  dead: number;
  duration: number;
}

/** What survives a charter. */
export interface ForestProfile {
  settings: ForestSettings;
  renown: number;
  grace: number;
  chartersCompleted: number;
  history: CharterRecord[];
}

export interface ForestGame {
  version: number;
  savedAt: number;
  profile: ForestProfile;
  company: Company;
}

export function createForestProfile(): ForestProfile {
  return { settings: { sound: false, reducedMotion: false }, renown: 0, grace: 0, chartersCompleted: 0, history: [] };
}

export function createForestGame(seed: number, now: number): ForestGame {
  return { version: FOREST_VERSION, savedAt: now, profile: createForestProfile(), company: createCompany(seed) };
}

function simulate(game: ForestGame, seconds: number): ForestGame {
  let company = game.company;
  for (let left = seconds; left > 0; left -= CATCH_UP_STEP_SECONDS) company = tickCompany(company, Math.min(CATCH_UP_STEP_SECONDS, left));
  return { ...game, company };
}

function away(game: ForestGame, gap: number): ForestGame {
  const seconds = Math.min(gap, OFFLINE_CAP_SECONDS);
  const g = simulate(game, seconds);
  if (seconds < ABSENCE_NOTE_SECONDS) return g;
  const relics = g.company.lifetimeRelics - game.company.lifetimeRelics;
  const silver = g.company.silver - game.company.silver;
  const sign = silver >= 0 ? '+' : '-';
  const text = `WHILE THE FACTOR WAS AWAY (${formatDuration(seconds)}): ${formatNumber(relics)} RELICS RECOVERED, ${sign}${formatNumber(Math.abs(silver))} THALERS.`;
  return { ...g, company: appendLog<EntryKind, Company>(g.company, 'ledger', text) };
}

/** Called by the live loop with real elapsed seconds since the previous frame. */
export function advance(game: ForestGame, dt: number): ForestGame {
  return dt <= LIVE_MAX_DT ? simulate(game, dt) : away(game, dt);
}

/** Called on load: simulate the time since the last save. */
export function catchUp(game: ForestGame, now: number): ForestGame {
  const gap = (now - game.savedAt) / 1000;
  if (gap <= 0) return game;
  return { ...away(game, gap), savedAt: now };
}
