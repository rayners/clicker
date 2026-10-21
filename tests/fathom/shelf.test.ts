import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { SHELF_OPENS_AT, TRAWLERS } from '../../src/fathom-data/shelf';
import { buoyCost, buyBuoy, buyTrawler, catchRate, coveredRange, isShelfOpen, rangeShare, shiftRange, trawlerCost } from '../../src/fathom/shelf';
import { depth } from '../../src/fathom/depth';
import { tickOutfit } from '../../src/fathom/tick';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const run = (o: Outfit, seconds: number) => {
  let next = o;
  for (let t = 0; t < seconds; t++) next = tickOutfit(next, 1);
  return next;
};
const skiff = TRAWLERS[0]!;
/** Deep enough that the shelf is open. */
const RICH = 1e5;
const fleet = (n: number, patch: Partial<Outfit> = {}) => fresh({ lifetimeCash: RICH, trawlers: { ...fresh().trawlers, [skiff.id]: n }, ...patch });

describe('the Shelf', () => {
  it('opens once the outfit has gone deep enough: depth is measured on the shared story scale', () => {
    expect(isShelfOpen(fresh())).toBe(false);
    expect(depth(fresh({ lifetimeCash: RICH }))).toBeGreaterThanOrEqual(SHELF_OPENS_AT);
    expect(isShelfOpen(fresh({ lifetimeCash: RICH }))).toBe(true);
    expect(buyTrawler(fresh({ cash: 1e6 }), skiff.id).trawlers[skiff.id]).toBe(0);
  });

  it('buys trawlers once open, each dearer, and they catch more the further out they fish', () => {
    const o = buyTrawler(fresh({ cash: 1e6, lifetimeCash: RICH }), skiff.id);
    expect(o.trawlers[skiff.id]).toBe(1);
    expect(trawlerCost(skiff, 1)).toBeGreaterThan(trawlerCost(skiff, 0));
    expect(catchRate(shiftRange(o, 1))).toBeGreaterThan(catchRate(o));
  });

  it('moves the range a tenth per tap, and buys sonar buoys that push safe water further out, each dearer', () => {
    const o = fresh({ cash: 1e6, lifetimeCash: RICH });
    expect(rangeShare(shiftRange(o, 1))).toBeCloseTo(rangeShare(o) + 0.1);
    const buoyed = buyBuoy(o);
    expect(buoyed.buoys).toBe(1);
    expect(coveredRange(buoyed)).toBeGreaterThan(coveredRange(o));
    expect(buoyCost(buoyed)).toBeGreaterThan(buoyCost(o));
  });

  it('loses boats fishing past the sonar\'s reach: something down there takes the nets, and the boat with them', () => {
    const blind = run(fleet(20, { range: 10, buoys: 0 }), 900);
    expect(blind.trawlers[skiff.id]).toBeLessThan(20);
    expect(blind.log.some((e) => /SQUID|OCTOPUS|TENTACLES|NET/.test(e.text))).toBe(true);
  });

  it('keeps boats inside the sonar\'s reach safe, and paying', () => {
    const safe = run(fleet(20, { range: 3, buoys: 5 }), 900);
    expect(safe.trawlers[skiff.id]).toBe(20);
    expect(safe.cash).toBeGreaterThan(0);
  });
});
