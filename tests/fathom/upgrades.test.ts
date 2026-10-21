import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { FATHOM_UPGRADES } from '../../src/fathom-data/upgrades';
import { availableUpgrades, buyUpgrade } from '../../src/fathom/upgrades';
import { coverage, incomeRate, openShare, swimmers } from '../../src/fathom/shallows';
import { blindShare, rangeShare } from '../../src/fathom/shelf';
import { contained, enhancement, specimens } from '../../src/fathom/open-water';
import { hullRate } from '../../src/fathom/trench';
import { tickOutfit } from '../../src/fathom/tick';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const kind = (k: string) => FATHOM_UPGRADES.find((u) => u.effect.kind === k)!;
const with_ = (k: string, patch: Partial<Outfit> = {}) => fresh({ upgrades: [kind(k).id], ...patch });

describe('requisitions', () => {
  it('are sold once unlocked by what the season has earned, once each, cheapest first', () => {
    const first = FATHOM_UPGRADES[0]!;
    expect(availableUpgrades(fresh())).toEqual([]);
    const rich = fresh({ cash: 1e6, lifetimeCash: 1e6 });
    expect(availableUpgrades(rich)[0]!.cost).toBeLessThanOrEqual(availableUpgrades(rich)[1]!.cost);
    const bought = buyUpgrade(rich, first.id);
    expect(bought.upgrades).toContain(first.id);
    expect(buyUpgrade(bought, first.id)).toBe(bought);
  });

  it('let the pass machines sell passes unattended', () => {
    let o = with_('autoPasses');
    for (let t = 0; t < 10; t++) o = tickOutfit(o, 1);
    expect(o.cash).toBeGreaterThan(0);
  });

  it('let the head lifeguard open the beach exactly as wide as the watch covers', () => {
    const o = with_('autoOpen', { attractions: { umbrellas: 20 }, guards: { lifeguard: 5 } });
    expect(openShare(o)).toBeGreaterThan(0);
    expect(coverage(o)).toBe(1);
    expect(swimmers(o)).toBe(20);
  });

  it('let the sonar operator send the boats exactly as far as the buoys see', () => {
    const o = with_('autoRange', { lifetimeCash: 1e5, trawlers: { skiff: 5 }, buoys: 4, range: 10 });
    expect(blindShare(o)).toBe(0);
    expect(rangeShare(o)).toBeCloseTo(0.5);
  });

  it('let the lab protocol enhance as far as the pens hold', () => {
    const o = with_('autoEnhance', { lifetimeCash: 1e7, specimens: { reef: 4 }, pens: 4 });
    expect(enhancement(o)).toBeGreaterThan(0);
    expect(contained(o)).toBeGreaterThanOrEqual(specimens(o));
  });

  it('let the station computer hold the station as deep as the hull allows', () => {
    const o = with_('autoStation', { lifetimeCash: 1e10, modules: 2, crews: 3, stationDepth: 1 });
    expect(o.stationDepth).toBe(1);
    const run = tickOutfit(o, 1);
    expect(run.stationDepth).toBeGreaterThan(1);
    expect(hullRate(run)).toBeGreaterThanOrEqual(0);
  });

  it('multiply money where they say', () => {
    const plain = fresh({ attractions: { umbrellas: 10 } });
    expect(incomeRate({ ...plain, upgrades: ['umbrellas-10'] })).toBeGreaterThan(incomeRate(plain));
  });
});
