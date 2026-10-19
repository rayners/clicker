import { describe, it, expect } from 'vitest';
import { createGame, tickGame, catchUp, OFFLINE_CAP_SECONDS } from '../../src/core/game';
import { buyGenerator } from '../../src/mission/economy';
import { GENERATORS } from '../../src/data/generators';

const NOW = 1_000_000;

describe('a new game', () => {
  it('keeps the persistent profile separate from the current mission', () => {
    const g = createGame(5, NOW);
    expect(g.profile.contractsCompleted).toBe(0);
    expect(g.profile.history).toEqual([]);
    expect(g.mission.elapsed).toBe(0);
    expect(g.boardroom).toBeUndefined();
  });

  it('stamps the creation time as the last save time', () => {
    expect(createGame(5, NOW).savedAt).toBe(NOW);
  });
});

describe('tickGame', () => {
  it('advances the active mission and leaves the profile untouched', () => {
    const g = createGame(5, NOW);
    const after = tickGame(g, 3);
    expect(after.mission.elapsed).toBe(3);
    expect(after.profile).toBe(g.profile);
  });
});

describe('offline catch-up', () => {
  const withDrones = () => {
    const g = createGame(5, NOW);
    return { ...g, mission: buyGenerator({ ...g.mission, credits: 1e6 }, GENERATORS[0]!.id) };
  };

  it('simulates the time since the last save', () => {
    const { game, elapsed } = catchUp(withDrones(), NOW + 60_000);
    expect(elapsed).toBe(60);
    expect(game.mission.elapsed).toBeCloseTo(60);
    expect(game.mission.lifetimeOre).toBeCloseTo(60 * GENERATORS[0]!.baseRate);
  });

  it('caps the simulated time at eight hours', () => {
    expect(OFFLINE_CAP_SECONDS).toBe(8 * 3600);
    const { elapsed, game } = catchUp(withDrones(), NOW + 48 * 3600 * 1000);
    expect(elapsed).toBe(OFFLINE_CAP_SECONDS);
    expect(game.mission.elapsed).toBeCloseTo(OFFLINE_CAP_SECONDS);
  });

  it('does nothing if the clock went backwards', () => {
    const g = withDrones();
    const { game, elapsed } = catchUp(g, NOW - 5000);
    expect(elapsed).toBe(0);
    expect(game).toBe(g);
  });

  it('updates savedAt to now so the same gap is never counted twice', () => {
    expect(catchUp(withDrones(), NOW + 10_000).game.savedAt).toBe(NOW + 10_000);
  });
});
