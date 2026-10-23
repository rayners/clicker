import { describe, it, expect } from 'vitest';
import { FATHOM_HUMS, soundCues } from '../../src/fathom-ui/sound';
import { createOutfit } from '../../src/fathom/state';

describe('DOWN THERE sound', () => {
  const o = createOutfit(1);

  it('thuds when the water takes someone, and sounds the alarm when a bigger kaiju makes landfall', () => {
    expect(soundCues(o, { ...o, bodyCount: o.bodyCount + 1 })).toEqual(['taken']);
    expect(soundCues(o, { ...o, category: o.category + 1 })).toEqual(['landfall']);
    expect(soundCues(o, o)).toEqual([]);
  });

  it('pings for every pass sold by hand', () => {
    expect(soundCues(o, { ...o, cash: o.cash + 5, lifetimeCash: o.lifetimeCash + 5 }, true)).toEqual(['pass']);
  });

  it('hums lower the deeper the season goes', () => {
    for (let i = 1; i < FATHOM_HUMS.length; i++) expect(FATHOM_HUMS[i]!.freq).toBeLessThan(FATHOM_HUMS[i - 1]!.freq);
  });
});
