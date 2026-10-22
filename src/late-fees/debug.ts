import type { LateGame } from './game';

/** Developer shortcuts (?debug=member) for testing what a new member cannot rent yet. Dev builds only. */
export const LATE_SCENARIOS = ['member'] as const;

export function applyLateScenario(game: LateGame, name: string): LateGame {
  // Every tape stocked and side B open, standing at the shelf.
  if (name === 'member') return { ...game, mode: 'films', shelf: true, profile: { ...game.profile, sequels: Math.max(10, game.profile.sequels) } };
  return game;
}
