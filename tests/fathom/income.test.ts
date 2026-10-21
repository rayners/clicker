import { describe, it, expect } from 'vitest';
import { createOutfit } from '../../src/fathom/state';
import { incomeNow } from '../../src/fathom/income';
import { tickOutfit } from '../../src/fathom/tick';

describe('income across every zone', () => {
  it('adds up what every open zone earns in a second', () => {
    const o = { ...createOutfit(1), lifetimeCash: 1e13, attractions: { umbrellas: 10 }, guards: { lifeguard: 10 }, trawlers: { skiff: 2 }, buoys: 5, specimens: { reef: 2 }, pens: 2, modules: 1, crews: 5 };
    expect(incomeNow(o)).toBeGreaterThan(0);
    const after = tickOutfit(o, 1);
    expect(after.lifetimeCash - o.lifetimeCash).toBeCloseTo(incomeNow(o), 0);
  });
});
