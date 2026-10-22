import type { FathomGame } from './game';

/** Developer shortcuts (?debug=veteran) for testing what a new outfit cannot reach yet. Dev builds only. */
export const FATHOM_SCENARIOS = ['veteran'] as const;

export function applyFathomScenario(game: FathomGame, name: string): FathomGame {
  // Enough seasons behind the outfit to open everything, still in the season.
  if (name === 'veteran') return { ...game, mode: 'season', profile: { ...game.profile, seasons: Math.max(10, game.profile.seasons) } };
  return game;
}
