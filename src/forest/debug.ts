import { FLOORS } from '../forest-data/keep';
import { postStrength } from './company';
import { createCompany, type Company } from './state';
import type { ForestGame } from './game';

/** Developer shortcuts (?debug=keep etc.) for trying a site without hours of play. */
export const FOREST_SCENARIOS = ['keep', 'keep-deep', 'veteran'] as const;

const KEEP_DEEP_FLOORS = 5;

function keepDeep(seed: number): Company {
  const base: Company = {
    ...createCompany(seed, undefined, 'keep'),
    act: 2,
    beats: { 'act-2': 0 },
    charted: FLOORS[KEEP_DEEP_FLOORS - 1]!.leagues,
    silver: 20_000,
    lifetimeRelics: 50_000,
    lifetimeSilver: 40_000,
    oil: 200,
    buildings: { appraisal: 4, armoury: 3, hospice: 1, chapel: 0 },
    floors: FLOORS.map((_, i) => ({ control: i < KEEP_DEEP_FLOORS ? 1 : 0, garrison: 0, secured: i < KEEP_DEEP_FLOORS })),
  };
  const per = postStrength(base);
  const posted = FLOORS.map((f, i) => (i < KEEP_DEEP_FLOORS ? Math.ceil(f.threat / per) : 0));
  const garrison = posted.reduce((a, b) => a + b, 0);
  return { ...base, posted, hired: { blade: garrison + 12, mender: 2, scout: 2, mystic: 1, sapper: 0 } };
}

export function applyForestScenario(game: ForestGame, name: string): ForestGame {
  const seed = game.company.seed;
  switch (name) {
    // Every site and tier open: for testing what a new Factor cannot reach yet.
    case 'veteran':
      return { ...game, profile: { ...game.profile, chartersCompleted: Math.max(10, game.profile.chartersCompleted) } };
    case 'keep':
      return { ...game, company: { ...createCompany(seed, undefined, 'keep'), silver: 400, hired: { blade: 6, mender: 1, scout: 1, mystic: 0, sapper: 0 } } };
    case 'keep-deep':
      return { ...game, company: keepDeep(seed) };
    default:
      return game;
  }
}
