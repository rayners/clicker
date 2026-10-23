import { CLASS_IDS } from '../forest-data/classes';
import { createCompany, type SiteId } from './state';
import type { ForestGame, ForestProfile } from './game';

export type Ending = 'sell' | 'return' | 'burn';
export interface Reward {
  renown: number;
  grace: number;
}

/** Charters finished before each site and tier opens (user, 2026-10-22: one to start, the rest unlocked). */
export const KEEP_UNLOCK_CHARTERS = 1;
export const WOOD_UNLOCK_CHARTERS = 2;
export const DRAGON_UNLOCK_CHARTERS = 4;

export const isKeepUnlocked = (p: ForestProfile): boolean => p.chartersCompleted >= KEEP_UNLOCK_CHARTERS;
export const isWoodUnlocked = (p: ForestProfile): boolean => p.chartersCompleted >= WOOD_UNLOCK_CHARTERS;
/** Legend as the wood that wakes the dragon early: a horror that has done well earns the next one. */
export const DRAGON_LEGEND = 3;
export const isDragonUnlocked = (p: ForestProfile): boolean => p.chartersCompleted >= DRAGON_UNLOCK_CHARTERS || (p.legend.wood ?? 0) >= DRAGON_LEGEND;
const isSiteOpen = (p: ForestProfile, site: SiteId): boolean => site === 'forest' || isKeepUnlocked(p);

const BURN_MIN_CHARTERS = 3;
const BURN_MIN_GRACE = 3;
const FRAGMENTS_PER_RENOWN = 2;
const HANDS_PER_GRACE = 15;

export function availableEndings(game: ForestGame): Ending[] {
  if (!game.company.flags.includes('terminus')) return [];
  const endings: Ending[] = ['sell', 'return'];
  if (game.profile.chartersCompleted >= BURN_MIN_CHARTERS && game.profile.grace >= BURN_MIN_GRACE) endings.push('burn');
  return endings;
}

const living = (game: ForestGame) => CLASS_IDS.reduce((s, id) => s + game.company.hired[id], 0);

export function endingRewards(game: ForestGame): Record<Ending, Reward> {
  const renown = 1 + Math.floor(game.company.keyFragments / FRAGMENTS_PER_RENOWN);
  const grace = 1 + Math.floor(living(game) / HANDS_PER_GRACE);
  return {
    sell: { renown, grace: 0 },
    return: { renown: 0, grace },
    burn: { renown, grace },
  };
}

/** Closes the charter with the Factor's choice and opens the next one, shaped by everything before it. */
export function completeCharter(game: ForestGame, ending: Ending, seed: number, site: SiteId = 'forest'): ForestGame {
  if (!availableEndings(game).includes(ending)) return game;
  const reward = endingRewards(game)[ending];
  const c = game.company;
  const profile: ForestProfile = {
    ...game.profile,
    renown: game.profile.renown + reward.renown,
    grace: game.profile.grace + reward.grace,
    chartersCompleted: game.profile.chartersCompleted + 1,
    history: [...game.profile.history, { ending, relics: c.lifetimeRelics, dead: c.lifetimeDead, duration: c.elapsed, site: c.site }],
  };
  // Checked against the profile with this charter counted: finishing the first one is what opens the Keep.
  const next = isSiteOpen(profile, site) ? site : 'forest';
  const company = createCompany(seed, { number: profile.chartersCompleted + 1, renown: profile.renown, grace: profile.grace }, next);
  return { ...game, profile, company };
}

/** Tears up the charter in hand for a fresh one at another site: the same terms, nothing earned for the one abandoned. */
export function rewriteCharter(game: ForestGame, site: SiteId, seed: number): ForestGame {
  if (game.company.site === site || !isSiteOpen(game.profile, site)) return game;
  return { ...game, company: createCompany(seed, game.company.charter, site) };
}
