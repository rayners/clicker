import { describe, it, expect } from 'vitest';
import { nextRandom, randomInt } from '../../src/engine/rng';

describe('seeded rng', () => {
  it('is deterministic for the same seed', () => {
    expect(nextRandom(42)).toEqual(nextRandom(42));
  });

  it('returns a value in [0, 1) and a new state to continue from', () => {
    let state = 1;
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextRandom(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      seen.add(value);
      state = next;
    }
    expect(seen.size).toBeGreaterThan(990);
  });

  it('keeps its state a plain serializable integer', () => {
    const [, next] = nextRandom(123);
    expect(Number.isInteger(next)).toBe(true);
  });

  it('randomInt returns integers within an inclusive range', () => {
    let state = 7;
    for (let i = 0; i < 200; i++) {
      const [value, next] = randomInt(state, 3, 5);
      expect([3, 4, 5]).toContain(value);
      state = next;
    }
  });
});
