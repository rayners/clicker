import { createClock } from '../engine/clock';
import { appendLog } from '../engine/log';
import { formatDuration, formatNumber } from '../engine/format';
import { tickCompany } from './company';
import { createCompany, type Company, type EntryKind } from './state';
import { tickWood, type WoodHunt } from './wood';
import { tickDragon, type DragonHunt } from './dragon';

export const FOREST_VERSION = 11;
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
  /** Where the charter delved; absent on records from before the Keep. */
  site?: string;
}

/** What survives a charter. */
export interface ForestProfile {
  settings: ForestSettings;
  renown: number;
  grace: number;
  chartersCompleted: number;
  history: CharterRecord[];
  /** Legend each horror has carried out of finished hunts (see docs/HORROR-TIER.md). */
  legend: Record<string, number>;
}

export interface ForestGame {
  version: number;
  savedAt: number;
  profile: ForestProfile;
  company: Company;
  /** Which side of the ledger is open: the charter, the wood or the dragon. Only that side's time passes. */
  mode: 'charter' | 'wood' | 'dragon';
  wood: WoodHunt | null;
  dragon: DragonHunt | null;
}

export function createForestProfile(): ForestProfile {
  return { settings: { sound: false, reducedMotion: false }, renown: 0, grace: 0, chartersCompleted: 0, history: [], legend: {} };
}

export function createForestGame(seed: number, now: number): ForestGame {
  return { version: FOREST_VERSION, savedAt: now, profile: createForestProfile(), company: createCompany(seed), mode: 'charter', wood: null, dragon: null };
}

/** The wood runs several companies at once; away from the screen it steps coarsely to keep catch-up cheap. */
const WOOD_CATCH_UP_STEP_SECONDS = 5;

const hunting = (game: ForestGame) => game.mode === 'wood' || game.mode === 'dragon';

const clock = createClock<ForestGame>({
  tick: (game, dt) =>
    game.mode === 'wood' ? tickWood(game, dt) : game.mode === 'dragon' ? tickDragon(game, dt) : { ...game, company: tickCompany(game.company, dt) },
  step: (game) => (hunting(game) ? WOOD_CATCH_UP_STEP_SECONDS : 1),
  noteAway(before, after, seconds) {
    if (seconds < ABSENCE_NOTE_SECONDS || before.mode !== 'charter') return after;
    const relics = after.company.lifetimeRelics - before.company.lifetimeRelics;
    const silver = after.company.silver - before.company.silver;
    const sign = silver >= 0 ? '+' : '-';
    const text = `WHILE THE FACTOR WAS AWAY (${formatDuration(seconds)}): ${formatNumber(relics)} RELICS RECOVERED, ${sign}${formatNumber(Math.abs(silver))} THALERS.`;
    return { ...after, company: appendLog<EntryKind, Company>(after.company, 'ledger', text) };
  },
});

/** Called by the live loop with real elapsed seconds since the previous frame. */
export const advance = clock.advance;

/** Called on load: simulate the time since the last save. */
export const catchUp = clock.catchUp;
