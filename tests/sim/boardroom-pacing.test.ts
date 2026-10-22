import { describe, it, expect } from 'vitest';
import { simulateBoard } from '../../src/sim/board-bot';

/** The Boardroom's slow burn runs to the same act targets as a contract (docs/BOARDROOM.md). */
describe('Boardroom pacing', () => {
  const run = simulateBoard({ seed: 7, maxSeconds: 8 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('reaches act 2 (the manifests) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches act 3 (the reconditioning order) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('reaches act 4 (the agenda) within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('ends the term at roughly 4-6 hours', () => {
    expect(hours(run.termAt)).toBeGreaterThan(4);
    expect(hours(run.termAt)).toBeLessThan(6);
  });
});
