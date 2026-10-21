import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { ATTRACTIONS, GUARDS } from '../../src/fathom-data/shallows';
import {
  attractionCost,
  buyAttraction,
  coverage,
  exposed,
  guardCost,
  hireGuard,
  incomeRate,
  openShare,
  sellPass,
  shiftOpen,
  swimmers,
} from '../../src/fathom/shallows';
import { tickOutfit } from '../../src/fathom/tick';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const run = (o: Outfit, seconds: number) => {
  let next = o;
  for (let t = 0; t < seconds; t++) next = tickOutfit(next, 1);
  return next;
};
const umbrellas = ATTRACTIONS[0]!;
const lifeguard = GUARDS[0]!;
const beach = (n: number, patch: Partial<Outfit> = {}) => fresh({ attractions: { ...fresh().attractions, [umbrellas.id]: n }, ...patch });
const guarded = (n: number) => ({ ...fresh().guards, [lifeguard.id]: n });

describe('Harrow Point Marine Safety: the Shallows', () => {
  it('opens with nothing on the beach, nobody on watch, and half the beach open', () => {
    const o = fresh();
    expect(swimmers(o)).toBe(0);
    expect(coverage(o)).toBe(1);
    expect(openShare(o)).toBe(0.5);
    expect(o.cash).toBe(0);
  });

  it('sells beach passes by hand', () => {
    expect(sellPass(fresh()).cash).toBeGreaterThan(0);
  });

  it('buys attractions, each dearer than the last; every one draws swimmers and earns while the beach is open', () => {
    const o = buyAttraction(fresh({ cash: 100 }), umbrellas.id);
    expect(o.attractions[umbrellas.id]).toBe(1);
    expect(o.cash).toBe(100 - attractionCost(umbrellas, 0));
    expect(attractionCost(umbrellas, 1)).toBeGreaterThan(attractionCost(umbrellas, 0));
    expect(swimmers(o)).toBeGreaterThan(0);
    expect(incomeRate(o)).toBeGreaterThan(0);
  });

  it('hires guards, each keeping a number of swimmers safe', () => {
    const o = hireGuard(fresh({ cash: 100 }), lifeguard.id);
    expect(o.guards[lifeguard.id]).toBe(1);
    expect(guardCost(lifeguard, 1)).toBeGreaterThan(guardCost(lifeguard, 0));
  });

  it('opens and closes the beach a tenth at a time: more open pays more and puts more people in the water', () => {
    const o = beach(10);
    const wide = shiftOpen(shiftOpen(o, 1), 1);
    expect(openShare(wide)).toBeCloseTo(0.7);
    expect(incomeRate(wide)).toBeGreaterThan(incomeRate(o));
    expect(exposed(wide)).toBeGreaterThan(exposed(o));
    expect(openShare(Array.from({ length: 20 }).reduce<Outfit>((x) => shiftOpen(x, -1), o))).toBe(0);
  });

  it('loses swimmers nobody is watching, and every death costs the town\'s trust, and the money with it', () => {
    const unguarded = run(beach(40, { open: 10 }), 900);
    expect(unguarded.bodyCount).toBeGreaterThan(0);
    expect(unguarded.reputation).toBeLessThan(1);
    expect(unguarded.log.some((e) => e.kind === 'attack')).toBe(true);
  });

  it('keeps watched swimmers safe', () => {
    const safe = run(beach(40, { open: 10, guards: guarded(30) }), 900);
    expect(safe.bodyCount).toBe(0);
  });

  it('earns tourist money every second the beach is open', () => {
    const later = run(beach(10, { guards: guarded(10) }), 60);
    expect(later.cash).toBeGreaterThan(0);
    expect(later.lifetimeCash).toBe(later.cash);
  });
});
