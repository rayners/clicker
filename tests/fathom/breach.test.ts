import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { CITIES, LANDFALL_SECONDS } from '../../src/fathom-data/breach';
import {
  activeBulwarks,
  buildBulwark,
  buildWall,
  bulwarkCost,
  citiesHeld,
  defence,
  hirePilot,
  links,
  bulwarkHold,
  isBreachOpen,
  levyRate,
  pilotCost,
  wallCost,
} from '../../src/fathom/breach';
import { tickOutfit } from '../../src/fathom/tick';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const run = (o: Outfit, seconds: number) => {
  let next = o;
  for (let t = 0; t < seconds; t++) next = tickOutfit(next, 1);
  return next;
};
const open = (patch: Partial<Outfit> = {}) => fresh({ flags: ['breach'], cash: 1e12, ...patch });
/** n pilots, all of one temperament, so every pair links perfectly. */
const crew = (n: number, temperament = 0.5) => ({ pilots: n, temperaments: Array.from({ length: n }, () => temperament) });
const held = (n: number) => CITIES.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));

describe('the Breach', () => {
  it('stays closed until the story opens it, and then every city on the coast starts in the outfit\'s hands', () => {
    expect(isBreachOpen(fresh())).toBe(false);
    expect(buildWall(fresh({ cash: 1e12 })).walls).toBe(0);
    const o = run(open(), 1);
    expect(isBreachOpen(o)).toBe(true);
    expect(citiesHeld(o)).toBe(CITIES.length);
  });

  it('builds walls and Bulwarks and hires pilots, each dearer; a Bulwark fights only with a pair of pilots', () => {
    let o = buildBulwark(buildWall(open()));
    expect(o.walls).toBe(1);
    expect(o.bulwarks).toBe(1);
    expect(activeBulwarks(o)).toBe(0);
    o = hirePilot(hirePilot(o));
    expect(activeBulwarks(o)).toBe(1);
    expect(wallCost({ ...o, walls: 2 })).toBeGreaterThan(wallCost(o));
    expect(bulwarkCost({ ...o, bulwarks: 2 })).toBeGreaterThan(bulwarkCost(o));
    expect(pilotCost({ ...o, pilots: 3 })).toBeGreaterThan(pilotCost(o));
    expect(defence(o)).toBeGreaterThan(defence(buildWall(open())));
  });

  it('collects a defence levy from every city it holds', () => {
    expect(levyRate(open({ cities: held(3) }))).toBeGreaterThan(levyRate(open({ cities: held(1) })));
  });

  it('brings a bigger kaiju ashore at every landfall', () => {
    const o = run(open(), LANDFALL_SECONDS + 5);
    expect(o.category).toBe(2);
    expect(o.log.some((e) => /CATEGORY 2/.test(e.text))).toBe(true);
  });

  it('loses undefended cities to the kaiju, nearest last: walls and Bulwarks hold them', () => {
    const naked = run(open({ cities: held(CITIES.length) }), 600);
    expect(citiesHeld(naked)).toBeLessThan(CITIES.length);
    const guarded = run(open({ cities: held(2), walls: 1 }), 600);
    expect(citiesHeld(guarded)).toBe(2);
  });

  it('takes lost cities back with force to spare', () => {
    const o = run(open({ cities: held(1), bulwarks: 10, ...crew(30) }), 600);
    expect(citiesHeld(o)).toBeGreaterThan(1);
  });
});

describe('the pilots and their link', () => {
  it('gives every pilot a temperament from the season\'s seed, the same each time', () => {
    const o = hirePilot(hirePilot(open()));
    expect(o.temperaments).toHaveLength(2);
    for (const t of o.temperaments) expect(t).toBeGreaterThanOrEqual(0);
    expect(hirePilot(hirePilot(open())).temperaments).toEqual(o.temperaments);
    expect(o.rng).not.toBe(open().rng);
  });

  it('pairs pilots of like temperament: the closer they are, the stronger the link', () => {
    expect(links(open({ pilots: 2, temperaments: [0.5, 0.5] }))).toEqual([1]);
    expect(links(open({ pilots: 2, temperaments: [0.1, 0.9] }))[0]).toBeLessThan(0.5);
    expect(links(open({ pilots: 4, temperaments: [0.1, 0.9, 0.12, 0.88] }))).toEqual([expect.closeTo(0.96, 5), expect.closeTo(0.96, 5)]);
  });

  it('holds the coast in proportion to the link: a badly matched pair barely stands up', () => {
    const matched = open({ bulwarks: 1, pilots: 2, temperaments: [0.5, 0.5] });
    const clashing = open({ bulwarks: 1, pilots: 2, temperaments: [0.1, 0.9] });
    expect(bulwarkHold(matched)).toBeGreaterThan(bulwarkHold(clashing) * 2);
    expect(defence(matched)).toBeGreaterThan(defence(clashing));
  });

  it('crews the Bulwarks with the best-linked pairs first', () => {
    const o = open({ bulwarks: 1, pilots: 4, temperaments: [0.1, 0.9, 0.5, 0.5] });
    expect(bulwarkHold(o)).toBe(bulwarkHold(open({ bulwarks: 1, ...crew(2) })));
  });

  it('tires pilots who fight with no one to relieve them, and lets a reserve rotate them out', () => {
    const worked = run(open({ cities: held(CITIES.length), bulwarks: 2, ...crew(4) }), 600);
    expect(worked.fatigue).toBeGreaterThan(0);
    expect(bulwarkHold(worked)).toBeLessThan(bulwarkHold({ ...worked, fatigue: 0 }));
    const rotated = run(open({ cities: held(CITIES.length), bulwarks: 2, ...crew(8), fatigue: 0.5 }), 600);
    expect(rotated.fatigue).toBeLessThan(0.5);
  });
});
