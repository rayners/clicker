import { describe, it, expect } from 'vitest';
import { FOREST_HUMS, soundCues } from '../../src/forest-ui/sound';
import { createCompany } from '../../src/forest/state';

describe('Elderdark sound', () => {
  const c = createCompany(1);

  it('scratches for a forage, tolls for the dead, sours for the turned and rings for a fragment of the Key', () => {
    expect(soundCues(c, c, true)).toEqual(['forage']);
    expect(soundCues(c, { ...c, lifetimeDead: c.lifetimeDead + 1 })).toEqual(['lost']);
    expect(soundCues(c, { ...c, turned: c.turned + 1 })).toEqual(['turned']);
    expect(soundCues(c, { ...c, keyFragments: c.keyFragments + 1 })).toEqual(['fragment']);
    expect(soundCues(c, c)).toEqual([]);
  });

  it('drones lower as the wood wakes', () => {
    for (let i = 1; i < FOREST_HUMS.length; i++) expect(FOREST_HUMS[i]!.freq).toBeLessThan(FOREST_HUMS[i - 1]!.freq);
  });
});
