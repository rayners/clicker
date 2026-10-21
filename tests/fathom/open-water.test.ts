import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { OPEN_WATER_AT, SPECIMENS } from '../../src/fathom-data/open-water';
import {
  beachPressure,
  buyPen,
  catchSpecimen,
  contained,
  enhancement,
  isOpenWaterOpen,
  penCost,
  researchRate,
  shiftEnhancement,
  specimenCost,
  specimens,
} from '../../src/fathom/open-water';
import { depth } from '../../src/fathom/depth';
import { tickOutfit } from '../../src/fathom/tick';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const run = (o: Outfit, seconds: number) => {
  let next = o;
  for (let t = 0; t < seconds; t++) next = tickOutfit(next, 1);
  return next;
};
const reef = SPECIMENS[0]!;
const DEEP = 1e7;
const lab = (n: number, patch: Partial<Outfit> = {}) => fresh({ lifetimeCash: DEEP, specimens: { ...fresh().specimens, [reef.id]: n }, ...patch });

describe('Open Water: the research station', () => {
  it('can only be built out once the outfit reaches open water', () => {
    expect(isOpenWaterOpen(fresh())).toBe(false);
    expect(depth(fresh({ lifetimeCash: DEEP }))).toBeGreaterThanOrEqual(OPEN_WATER_AT);
    expect(catchSpecimen(fresh({ cash: 1e9 }), reef.id).specimens[reef.id]).toBe(0);
  });

  it('catches specimens and builds pens, each dearer; specimens pay for research', () => {
    const o = catchSpecimen(buyPen(fresh({ cash: 1e9, lifetimeCash: DEEP })), reef.id);
    expect(o.specimens[reef.id]).toBe(1);
    expect(o.pens).toBe(1);
    expect(specimenCost(reef, 1)).toBeGreaterThan(specimenCost(reef, 0));
    expect(penCost({ ...o, pens: 2 })).toBeGreaterThan(penCost(o));
    expect(researchRate(o)).toBeGreaterThan(0);
  });

  it('pays more for enhanced specimens, and enhanced specimens are harder to hold', () => {
    const o = lab(4, { pens: 2 });
    const pushed = shiftEnhancement(shiftEnhancement(o, 1), 1);
    expect(enhancement(pushed)).toBeCloseTo(enhancement(o) + 0.2);
    expect(researchRate(pushed)).toBeGreaterThan(researchRate(o));
    expect(contained(pushed)).toBeLessThan(contained(o));
  });

  it('lets uncontained specimens escape, and every one loose makes the beach more dangerous', () => {
    const leaky = run(lab(20, { pens: 1, enhance: 10 }), 600);
    expect(specimens(leaky)).toBeLessThan(20);
    expect(leaky.loose).toBeGreaterThan(0);
    expect(beachPressure(leaky)).toBeGreaterThan(beachPressure(fresh()));
  });

  it('holds specimens with enough pens, and the escapees swim off in time', () => {
    const held = run(lab(4, { pens: 10, enhance: 0 }), 600);
    expect(specimens(held)).toBe(4);
    expect(run(fresh({ loose: 3 }), 2_000).loose).toBeLessThan(3);
  });
});
