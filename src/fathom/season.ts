import { citiesHeld } from './breach';
import { depth } from './depth';
import { createOutfit } from './state';
import type { FathomGame, FathomProfile } from './game';

export type Ending = 'close' | 'study' | 'through';
export interface Reward {
  standing: number;
  notes: number;
}

const THROUGH_MIN_SEASONS = 3;
const THROUGH_MIN_NOTES = 3;
const CITIES_PER_NOTE = 2;
/** Depth (story scale) per point of standing when the company studies the seam. */
const DEPTH_PER_STANDING = 5_000;

export function availableEndings(game: FathomGame): Ending[] {
  if (!game.outfit.flags.includes('terminus')) return [];
  const endings: Ending[] = ['close', 'study'];
  if (game.profile.seasons >= THROUGH_MIN_SEASONS && game.profile.notes >= THROUGH_MIN_NOTES) endings.push('through');
  return endings;
}

/** Closing it earns field notes (more for every city still standing); studying it earns standing (more for every metre). */
export function endingRewards(game: FathomGame): Record<Ending, Reward> {
  const notes = 1 + Math.floor(citiesHeld(game.outfit) / CITIES_PER_NOTE);
  const standing = 1 + Math.floor(depth(game.outfit) / DEPTH_PER_STANDING);
  return { close: { standing: 0, notes }, study: { standing, notes: 0 }, through: { standing, notes } };
}

/** Ends the season with the outfit's choice and opens the next, shaped by everything before it. */
export function completeSeason(game: FathomGame, ending: Ending, seed: number): FathomGame {
  if (!availableEndings(game).includes(ending)) return game;
  const reward = endingRewards(game)[ending];
  const o = game.outfit;
  const profile: FathomProfile = {
    ...game.profile,
    standing: game.profile.standing + reward.standing,
    notes: game.profile.notes + reward.notes,
    seasons: game.profile.seasons + 1,
    endingsSeen: game.profile.endingsSeen.includes(ending) ? game.profile.endingsSeen : [...game.profile.endingsSeen, ending],
    history: [...game.profile.history, { ending, bodyCount: o.bodyCount, depth: depth(o), duration: o.elapsed }],
  };
  const outfit = createOutfit(seed, { season: profile.seasons + 1, standing: profile.standing, notes: profile.notes });
  return { ...game, profile, outfit };
}
