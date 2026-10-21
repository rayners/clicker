import { describe, it, expect } from 'vitest';
import { simulateFathom } from '../../src/fathom/bot';
import { citiesHeld } from '../../src/fathom/breach';

/** The same act targets as the other games: depth is the clock. */
describe('first season pacing', () => {
  const run = simulateFathom({ seed: 7, maxSeconds: 7 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('reaches open water and something bigger (act 2) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches the source in the trench (act 3) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('brings the first kaiju ashore (act 4) after act 3, within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeGreaterThan(hours(run.actAt[3]));
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('ends the season at roughly 4-5 hours, with some of the coast still standing', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(5);
    expect(citiesHeld(run.final.outfit)).toBeGreaterThan(0);
  });
});
