import { describe, it, expect } from 'vitest';
import { simulateClips } from '../../src/clips/bot';

const MIN = 60;

describe('CLIP WORKS pacing, played by a sensible bot', () => {
  for (const seed of [1, 7, 42]) {
    it(`reaches the trade in minutes, the capital within the hour, and a million clips in two or three hours (seed ${seed})`, () => {
      const run = simulateClips({ seed, maxSeconds: 5 * 3600 });
      expect(run.firstAt.firstClipper).toBeLessThan(5 * MIN);
      expect(run.actAt[2]).toBeGreaterThan(3 * MIN);
      expect(run.actAt[2]).toBeLessThan(10 * MIN);
      expect(run.actAt[3]).toBeGreaterThan(30 * MIN);
      expect(run.actAt[3]).toBeLessThan(75 * MIN);
      expect(run.doneAt).toBeGreaterThan(90 * MIN);
      expect(run.doneAt).toBeLessThan(4 * 60 * MIN);
    });
  }
});
