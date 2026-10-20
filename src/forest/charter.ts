import { CLASS_IDS } from '../forest-data/classes';
import { createCompany } from './state';
import type { ForestGame, ForestProfile } from './game';

export type Ending = 'sell' | 'return' | 'burn';
export interface Reward {
  renown: number;
  grace: number;
}

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
export function completeCharter(game: ForestGame, ending: Ending, seed: number): ForestGame {
  if (!availableEndings(game).includes(ending)) return game;
  const reward = endingRewards(game)[ending];
  const c = game.company;
  const profile: ForestProfile = {
    ...game.profile,
    renown: game.profile.renown + reward.renown,
    grace: game.profile.grace + reward.grace,
    chartersCompleted: game.profile.chartersCompleted + 1,
    history: [...game.profile.history, { ending, relics: c.lifetimeRelics, dead: c.lifetimeDead, duration: c.elapsed }],
  };
  const company = createCompany(seed, { number: profile.chartersCompleted + 1, renown: profile.renown, grace: profile.grace });
  return { ...game, profile, company };
}
