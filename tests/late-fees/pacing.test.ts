import { describe, it, expect } from 'vitest';
import { simulateLate } from '../../src/late-fees/bot';

const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

/** The same act targets as the other two games, played by a reasonable (not optimal) bot. */
describe('Friday the 12th pacing', () => {
  const run = simulateLate({ seed: 7, maxSeconds: 9 * 3600 });

  it('reaches the body count (act 2) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('brings in the final girl (act 3) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('reaches the confrontation (act 4) within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('rolls credits within about 4-6 hours', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
  });

  it('has a body count worth the name', () => {
    expect(run.final.run.bodyCount).toBeGreaterThan(50);
  });
});

describe('a sequel', () => {
  it('is still finishable against the stronger killer, and no slower', () => {
    const first = simulateLate({ seed: 7, maxSeconds: 9 * 3600 });
    const second = simulateLate({ seed: 7, maxSeconds: 9 * 3600, sequels: 1 });
    expect(second.terminusAt).toBeDefined();
    expect(second.terminusAt!).toBeLessThanOrEqual(first.terminusAt!);
  });
});

describe('A Nightmare on Sycamore Street pacing', () => {
  const run = simulateLate({ seed: 7, venue: 'clinic', maxSeconds: 9 * 3600 });

  it('reaches the body count (act 2) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('brings in the final girl (act 3) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('rolls credits within about 4-6 hours, with deaths along the way', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
    expect(run.final.run.bodyCount).toBeGreaterThan(20);
  });
});

describe('Penultimate Destination pacing', () => {
  const run = simulateLate({ seed: 7, venue: 'insurer', maxSeconds: 9 * 3600 });

  it('reaches the body count (act 2) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('brings in the final girl (act 3) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('rolls credits within about 4-6 hours, with names crossed off along the way but not the whole list', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
    expect(run.final.run.bodyCount).toBeGreaterThan(5);
    expect((run.final.run as import('../../src/late-fees/state').InsurerRun).list.length).toBeGreaterThan(0);
  });
});

describe('Candy Corn Day pacing', () => {
  const run = simulateLate({ seed: 7, venue: 'asylum', maxSeconds: 9 * 3600 });

  it('reaches the body count (act 2) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches Candy Corn Day itself (act 3) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('rolls credits within about 4-6 hours, with escapes and deaths along the way', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
    expect(run.final.run.bodyCount).toBeGreaterThan(20);
  });
});
