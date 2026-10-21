import { describe, it, expect } from 'vitest';
import { simulateForest } from '../../src/forest/bot';

/** The same targets as a forest charter: the Keep is a different balancing problem, not a different length of game. */
describe('first Keep charter pacing', () => {
  const run = simulateForest({ seed: 7, maxSeconds: 6 * 3600, site: 'keep' });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('takes the gatehouse within the first ten minutes', () => {
    expect(hours(run.floorAt.gatehouse)).toBeLessThan(10 / 60);
  });

  it('takes the kitchens and cellars (Act II) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('finds the first fragment of the Key on the drowned stair (Act III) at roughly 2-3.25 hours', () => {
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

  it('holds what it takes until the wood wakes: most floors taken by then are still held', () => {
    const taken = Object.values(run.floorAt).filter((t) => t <= run.actAt[4]!).length;
    expect(run.heldAt[4]).toBeGreaterThanOrEqual(Math.ceil(taken * 0.6));
  });
});
