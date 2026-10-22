import { describe, it, expect } from 'vitest';
import { cueForLog, humFor, MAX_PRINTED_LINES, PRINT_SECONDS, PRINT_STAGGER, printSchedule } from '../../src/ui/sound';

describe('sound cues', () => {
  it('gives each kind of log entry its own voice', () => {
    expect(cueForLog('sys')).toBe('teletype');
    expect(cueForLog('crew')).toBe('teletype');
    expect(cueForLog('corp')).toBe('chime');
    expect(cueForLog('anomaly')).toBe('drone');
  });
});

describe('the teletype keeps time with the print', () => {
  it('clicks through each line as it prints, each line starting when its animation does', () => {
    const one = printSchedule(1);
    expect(one).toHaveLength(6);
    expect(one[0]).toBe(0);
    expect(one.at(-1)!).toBeLessThan(PRINT_SECONDS);
    const two = printSchedule(2);
    expect(two).toHaveLength(12);
    expect(two[6]).toBeCloseTo(PRINT_STAGGER);
  });

  it('never chatters through a burst of lines', () => {
    expect(printSchedule(40).length).toBeLessThanOrEqual(6 * MAX_PRINTED_LINES);
  });
});

describe('the hum under every act', () => {
  it('starts quiet and steady, and grows lower, rougher and less steady act by act', () => {
    const hums = [1, 2, 3, 4].map(humFor);
    expect(hums[0]!.beat).toBe(0);
    expect(hums[1]!.beat).toBeGreaterThan(0);
    for (let i = 1; i < hums.length; i++) {
      expect(hums[i]!.freq).toBeLessThanOrEqual(hums[i - 1]!.freq);
      expect(hums[i]!.gain).toBeGreaterThanOrEqual(hums[i - 1]!.gain);
    }
    expect(hums[3]!.pulse).toBeGreaterThan(0);
    expect(humFor(9)).toEqual(humFor(4));
  });
});
