import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/game';
import { HUNTER_LEGEND, HUNTER_UNLOCK_CONTRACTS, isHunterUnlocked } from '../../src/core/prestige';

describe('Legend opens the next horror early', () => {
  it('offers the hunt to a player whose creature has earned enough Legend, before the fifth contract', () => {
    const p = { ...createGame(1, 0).profile, contractsCompleted: 3 };
    expect(HUNTER_UNLOCK_CONTRACTS).toBe(5);
    expect(isHunterUnlocked(p)).toBe(false);
    expect(isHunterUnlocked({ ...p, legend: { creature: HUNTER_LEGEND - 1 } })).toBe(false);
    expect(isHunterUnlocked({ ...p, legend: { creature: HUNTER_LEGEND } })).toBe(true);
  });
});
