import { describe, it, expect } from 'vitest';
import { simulateForest } from '../../src/forest/bot';

/**
 * Pacing goals for a first charter, played by a reasonable (not optimal) bot. The wood is dangerous from the
 * start, but the deeper story is gated by how far the company has charted.
 */
describe('first charter pacing', () => {
  const run = simulateForest({ seed: 7, maxSeconds: 6 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('opens Briar Hollows within the first quarter hour', () => {
    expect(hours(run.openedAt.hollows)).toBeLessThan(0.25);
  });

  it('reaches the Drowned Barrows (Act II) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches the Undercity at roughly 2-3 hours', () => {
    expect(hours(run.openedAt.undercity)).toBeGreaterThan(2);
    expect(hours(run.openedAt.undercity)).toBeLessThan(3);
  });

  it('finds the first fragment of the Key (Act III) at roughly 2-3.25 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3.25);
  });

  it('wakes the wood (Act IV) after Act III, within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeGreaterThan(hours(run.actAt[3]));
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('brings the charter to its reckoning at roughly 3.75-5.5 hours', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(3.75);
    expect(hours(run.terminusAt)).toBeLessThan(5.5);
  });
});
