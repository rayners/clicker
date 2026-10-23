import { describe, it, expect } from 'vitest';
import { createGame, tickGame, catchUp, advance, OFFLINE_CAP_SECONDS } from '../../src/core/game';
import { startCreature } from '../../src/core/creature';
import { buyGenerator } from '../../src/mission/extraction/economy';
import { GENERATORS } from '../../src/data/extraction/generators';
import { ext } from '../helpers';

const NOW = 1_000_000;

describe('a new game', () => {
  it('keeps the persistent profile separate from the current mission', () => {
    const g = createGame(5, NOW);
    expect(g.profile.contractsCompleted).toBe(0);
    expect(g.profile.history).toEqual([]);
    expect(g.mission.elapsed).toBe(0);
    expect(g.boardroom).toBeNull();
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
    expect(ext(game.mission).lifetimeOre).toBeCloseTo(60 * GENERATORS[0]!.baseRate);
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

describe('offline catch-up stays quick enough for a phone', () => {
  it('catches up eight hours away as the creature (three contracts at once) in a few seconds at most', () => {
    const g = startCreature(createGame(1, NOW), 3);
    const t0 = performance.now();
    catchUp({ ...g, savedAt: 0 }, 8 * 3600 * 1000);
    expect(performance.now() - t0).toBeLessThan(10_000);
  }, 60_000);
});

describe('advance (the live loop)', () => {
  it('ticks normally for short frame gaps', () => {
    const g = createGame(5, NOW);
    const { game, offlineSeconds } = advance(g, 0.1);
    expect(game.mission.elapsed).toBeCloseTo(0.1);
    expect(offlineSeconds).toBe(0);
  });

  it('treats a long gap (backgrounded tab, sleeping phone) as offline time, capped', () => {
    const g = createGame(5, NOW);
    const { game, offlineSeconds } = advance(g, 20 * 3600);
    expect(offlineSeconds).toBe(OFFLINE_CAP_SECONDS);
    expect(game.mission.elapsed).toBeCloseTo(OFFLINE_CAP_SECONDS);
  });

  it('writes a "while you slept" summary to the log after a meaningful absence', () => {
    const g = createGame(5, NOW);
    const { game } = advance(g, 3600);
    expect(game.mission.log.at(-1)!.text).toMatch(/1h 0m/);
  });

  it('ignores time running backwards (the device clock was set back), in every mode', () => {
    const g = createGame(5, NOW);
    expect(advance(g, -3600).game).toBe(g);
    expect(advance(g, 0).game).toBe(g);
  });

  it('does not log brief absences', () => {
    const g = createGame(5, NOW);
    const { game } = advance(g, 30);
    expect(game.mission.log.length).toBe(g.mission.log.length);
  });
});
