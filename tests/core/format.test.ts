import { describe, it, expect } from 'vitest';
import { formatNumber, formatDuration, formatClock } from '../../src/core/format';

describe('formatNumber', () => {
  it('shows small whole numbers as-is', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(999)).toBe('999');
  });

  it('shows at most one decimal below 100, trimming trailing zeros', () => {
    expect(formatNumber(12.34)).toBe('12.3');
    expect(formatNumber(2.0)).toBe('2');
    expect(formatNumber(0.25)).toBe('0.2');
  });

  it('floors values between 100 and 1000 so the display never overstates what you have', () => {
    expect(formatNumber(150.9)).toBe('150');
  });

  it('uses short suffixes with three significant digits from a thousand up', () => {
    expect(formatNumber(1234)).toBe('1.23k');
    expect(formatNumber(12_345)).toBe('12.3k');
    expect(formatNumber(123_456)).toBe('123k');
    expect(formatNumber(1_500_000)).toBe('1.50M');
    expect(formatNumber(2e9)).toBe('2.00B');
    expect(formatNumber(3.21e12)).toBe('3.21T');
  });

  it('never rounds up into the next suffix boundary', () => {
    expect(formatNumber(999_999)).toBe('999k');
  });

  it('switches to scientific notation beyond the named suffixes', () => {
    expect(formatNumber(4.56e40)).toBe('4.56e40');
  });

  it('handles negatives', () => {
    expect(formatNumber(-1234)).toBe('-1.23k');
  });
});

describe('formatDuration', () => {
  it('shows seconds under a minute', () => {
    expect(formatDuration(45.7)).toBe('45s');
  });

  it('shows minutes and zero-padded seconds under an hour', () => {
    expect(formatDuration(185)).toBe('3m 05s');
  });

  it('shows hours and minutes under a day', () => {
    expect(formatDuration(2 * 3600 + 14 * 60 + 30)).toBe('2h 14m');
  });

  it('shows days and hours beyond that', () => {
    expect(formatDuration(3 * 86400 + 4 * 3600)).toBe('3d 4h');
  });
});

describe('formatClock', () => {
  it('shows mission time as zero-padded hh:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(3725.9)).toBe('01:02:05');
  });

  it('lets hours run past a day, like a mission elapsed timer', () => {
    expect(formatClock(26 * 3600)).toBe('26:00:00');
  });
});
