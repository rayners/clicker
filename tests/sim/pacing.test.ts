import { describe, it, expect } from 'vitest';
import { simulateRun } from '../../src/sim/bot';

/**
 * Pacing goals for a first contract, played by a reasonable (not optimal) bot:
 * active clicking for the first stretch, then mostly idle with sensible purchases.
 * The horror must not be obvious until roughly two hours of progress in.
 */
describe('first-contract pacing', () => {
  const run = simulateRun({ seed: 7, maxSeconds: 9 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('reaches act 2 (subtle tells) at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches act 3 (the cavity) at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('reaches act 4 (infestation) after act 3, within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeGreaterThan(hours(run.actAt[3]));
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('opens the terminus within about 4-6 hours', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
  });
});

describe('repeat-contract pacing', () => {
  it('is faster with seniority from a delivered contract', () => {
    const first = simulateRun({ seed: 7, maxSeconds: 9 * 3600 });
    const second = simulateRun({ seed: 7, maxSeconds: 9 * 3600, seniority: 3 });
    expect(second.terminusAt!).toBeLessThan(first.terminusAt!);
  });
});

/** The same horror timing has to hold on a terraforming contract, with its own economy. */
describe('first terraforming contract pacing', () => {
  const run = simulateRun({ seed: 7, scenario: 'terraform', maxSeconds: 9 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('reaches act 2 at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches act 3 at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('reaches act 4 after act 3, within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeGreaterThan(hours(run.actAt[3]));
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('opens the terminus within about 4-6 hours', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
  });
});

/** And on a security contract, where progress is ground taken and held. */
describe('first security contract pacing', () => {
  const run = simulateRun({ seed: 7, scenario: 'security', maxSeconds: 9 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('reaches act 2 at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches act 3 at roughly 2-3 hours', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('reaches act 4 after act 3, within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeGreaterThan(hours(run.actAt[3]));
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('opens the terminus within about 4-6 hours', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
  });
});

/** And on a haulage contract, where progress is freight delivered. */
describe('first haulage contract pacing', () => {
  const run = simulateRun({ seed: 7, scenario: 'haulage', maxSeconds: 9 * 3600 });
  const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);

  it('reaches act 2 at roughly 40-75 minutes', () => {
    expect(hours(run.actAt[2])).toBeGreaterThan(40 / 60);
    expect(hours(run.actAt[2])).toBeLessThan(75 / 60);
  });

  it('reaches act 3 at roughly 2-3 hours, after answering the beacon', () => {
    expect(hours(run.actAt[3])).toBeGreaterThan(2);
    expect(hours(run.actAt[3])).toBeLessThan(3);
  });

  it('reaches act 4 after act 3, within 4 hours', () => {
    expect(hours(run.actAt[4])).toBeGreaterThan(hours(run.actAt[3]));
    expect(hours(run.actAt[4])).toBeLessThan(4);
  });

  it('opens the terminus within about 4-6 hours', () => {
    expect(hours(run.terminusAt)).toBeGreaterThan(4);
    expect(hours(run.terminusAt)).toBeLessThan(6);
  });
});
