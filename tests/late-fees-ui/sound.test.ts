import { describe, it, expect } from 'vitest';
import { LATE_HUMS, soundCues } from '../../src/late-fees-ui/sound';
import { createLateGame } from '../../src/late-fees/game';

describe('LATE FEES sound', () => {
  const r = createLateGame(1, 0).run;

  it('clicks the tape for a press, stabs for a kill, swells for a new act, and rolls for the credits', () => {
    expect(soundCues(r, r, true)).toEqual(['press']);
    expect(soundCues(r, { ...r, bodyCount: r.bodyCount + 1 })).toEqual(['kill']);
    expect(soundCues(r, { ...r, act: r.act + 1 })).toEqual(['act']);
    expect(soundCues(r, { ...r, flags: [...r.flags, 'terminus'] })).toEqual(['credits']);
    expect(soundCues(r, r)).toEqual([]);
  });

  it('pulses faster and lower as the film goes on', () => {
    for (let i = 1; i < LATE_HUMS.length; i++) {
      expect(LATE_HUMS[i]!.freq).toBeLessThanOrEqual(LATE_HUMS[i - 1]!.freq);
      expect(LATE_HUMS[i]!.pulse).toBeGreaterThan(LATE_HUMS[i - 1]!.pulse);
    }
  });
});
