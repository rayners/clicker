import { describe, it, expect } from 'vitest';
import { formatDay, DAY_SECONDS } from '../../src/forest/calendar';

describe('the Thistlegate calendar', () => {
  it('counts days and bells from the charter', () => {
    expect(formatDay(0)).toBe('DAY 1 · 1ST BELL');
    expect(formatDay(125)).toBe('DAY 1 · 3RD BELL');
    expect(formatDay(DAY_SECONDS + 11 * 60)).toBe('DAY 2 · 12TH BELL');
  });
});
