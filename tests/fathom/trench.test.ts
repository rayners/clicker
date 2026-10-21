import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { CREW_PER_MODULE, SOURCE_NOTCH, TRENCH_AT } from '../../src/fathom-data/trench';
import { buyModule, crewCost, hireRepairCrew, hullRate, isTrenchOpen, moduleCost, reachedSource, sampleRate, shiftStation } from '../../src/fathom/trench';
import { depth } from '../../src/fathom/depth';
import { tickOutfit } from '../../src/fathom/tick';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const run = (o: Outfit, seconds: number) => {
  let next = o;
  for (let t = 0; t < seconds; t++) next = tickOutfit(next, 1);
  return next;
};
const DEEPER = 1e10;
const station = (modules: number, patch: Partial<Outfit> = {}) => fresh({ lifetimeCash: DEEPER, modules, ...patch });

describe('the Trench: the pressure station', () => {
  it('can only be built once the outfit reaches the trench', () => {
    expect(isTrenchOpen(fresh())).toBe(false);
    expect(depth(fresh({ lifetimeCash: DEEPER }))).toBeGreaterThanOrEqual(TRENCH_AT);
    expect(buyModule(fresh({ cash: 1e12 })).modules).toBe(0);
  });

  it('adds modules and repair crews, each dearer; modules pay for abyssal samples, more the deeper the station sits', () => {
    const o = hireRepairCrew(buyModule(fresh({ cash: 1e12, lifetimeCash: DEEPER })));
    expect(o.modules).toBe(1);
    expect(o.crews).toBe(1);
    expect(moduleCost({ ...o, modules: 2 })).toBeGreaterThan(moduleCost(o));
    expect(crewCost({ ...o, crews: 2 })).toBeGreaterThan(crewCost(o));
    expect(sampleRate(shiftStation(o, 1))).toBeGreaterThan(sampleRate(o));
  });

  it('loses hull integrity faster the deeper it sits, and repair crews win it back', () => {
    expect(hullRate(station(2, { stationDepth: 9 }))).toBeLessThan(hullRate(station(2, { stationDepth: 2 })));
    expect(hullRate(station(2, { stationDepth: 9, crews: 20 }))).toBeGreaterThan(hullRate(station(2, { stationDepth: 9 })));
  });

  it('floods a module when the hull gives out, and its crew with it', () => {
    const failing = run(station(3, { stationDepth: 10, integrity: 0.05 }), 30);
    expect(failing.modules).toBe(2);
    expect(failing.bodyCount).toBe(CREW_PER_MODULE);
    expect(failing.log.some((e) => e.kind === 'attack')).toBe(true);
  });

  it('holds together with enough crews, and reaches the source on the trench floor', () => {
    const steady = run(station(3, { stationDepth: SOURCE_NOTCH, crews: 30 }), 600);
    expect(steady.modules).toBe(3);
    expect(reachedSource(steady)).toBe(true);
    expect(reachedSource(station(3, { stationDepth: SOURCE_NOTCH - 1 }))).toBe(false);
  });
});
