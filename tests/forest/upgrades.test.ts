import { describe, it, expect } from 'vitest';
import { FOREST_UPGRADES, type ForestUpgrade } from '../../src/forest-data/upgrades';
import { REGIONS } from '../../src/forest-data/regions';
import { CLASS_IDS } from '../../src/forest-data/classes';
import { createCompany, type Company } from '../../src/forest/state';
import {
  autoForageRate,
  availableUpgrades,
  buyUpgrade,
  chartingPerTrip,
  dispatch,
  forage,
  FORAGE_YIELD,
  maxStandingRegions,
  project,
  tickCompany,
  toggleStanding,
  wages,
} from '../../src/forest/company';

const fresh = (patch: Partial<Company> = {}): Company => ({ ...createCompany(1), ...patch });
const eaves = REGIONS[0]!;
const own = (c: Company, ...kinds: ForestUpgrade['effect']['kind'][]) => ({
  ...c,
  upgrades: [...c.upgrades, ...kinds.map((k) => FOREST_UPGRADES.find((u) => u.effect.kind === k)!.id)],
});
const first = (kind: ForestUpgrade['effect']['kind']) => FOREST_UPGRADES.find((u) => u.effect.kind === kind)!;
const run = (c: Company, seconds: number) => {
  let next = c;
  for (let t = 0; t < seconds; t++) next = tickCompany(next, 1);
  return next;
};
const staffed = (patch: Partial<Company> = {}) =>
  fresh({
    silver: 1e9,
    hired: { blade: 12, mender: 2, scout: 4, mystic: 0 },
    orders: { ...fresh().orders, [eaves.id]: { blade: 3, mender: 0, scout: 1, mystic: 0 } },
    ...patch,
  });

describe('the upgrade table', () => {
  it('has unique ids, positive costs, and something to say', () => {
    expect(new Set(FOREST_UPGRADES.map((u) => u.id)).size).toBe(FOREST_UPGRADES.length);
    for (const u of FOREST_UPGRADES) {
      expect(u.cost).toBeGreaterThan(0);
      expect(u.name && u.description).toBeTruthy();
    }
  });

  it('offers the first automation early', () => {
    expect(first('quartermaster').cost).toBeLessThan(1_000);
    expect(first('autoForage').cost).toBeLessThan(first('quartermaster').cost);
  });
});

describe('buying upgrades', () => {
  it('only offers upgrades once unlocked, cheapest first', () => {
    const offered = availableUpgrades(fresh());
    expect(offered.every((u) => (u.unlock.relics ?? 0) <= 0 && (u.unlock.delve ?? 0) <= 0)).toBe(true);
    const later = availableUpgrades(fresh({ lifetimeRelics: 1e12, charted: 99 }));
    expect(later.length).toBeGreaterThan(offered.length);
    expect(later.map((u) => u.cost)).toEqual([...later.map((u) => u.cost)].sort((a, b) => a - b));
  });

  it('deducts the cost once, and never twice', () => {
    const u = FOREST_UPGRADES[0]!;
    const c = buyUpgrade(fresh({ silver: 1e9, lifetimeRelics: 1e12, charted: 99 }), u.id);
    expect(c.upgrades).toEqual([u.id]);
    expect(c.silver).toBe(1e9 - u.cost);
    expect(buyUpgrade(c, u.id)).toBe(c);
  });
});

describe('upgrade effects', () => {
  it('class strength upgrades make parties of that class stronger', () => {
    const u = first('classStrength');
    if (u.effect.kind !== 'classStrength') throw new Error('fixture');
    const comp = { blade: 0, mender: 0, scout: 0, mystic: 0, [u.effect.id]: 3 };
    expect(project(own(fresh(), 'classStrength'), eaves, comp).strength).toBeCloseTo(project(fresh(), eaves, comp).strength * u.effect.value);
  });

  it('haul, wound, blight and wage upgrades do what they say', () => {
    const comp = { blade: 3, mender: 0, scout: 1, mystic: 0 };
    const base = project(fresh(), eaves, comp);
    expect(project(own(fresh(), 'haulMultiplier'), eaves, comp).haul).toBeGreaterThan(base.haul);
    expect(project(own(fresh(), 'woundMultiplier'), eaves, comp).woundRisk).toBeLessThan(base.woundRisk);
    expect(project(own(fresh(), 'blightMultiplier'), eaves, comp).blightPerHand).toBeLessThan(base.blightPerHand);
    const crew = fresh({ hired: { blade: 10, mender: 0, scout: 0, mystic: 0 } });
    expect(wages(own(crew, 'wageMultiplier'))).toBeLessThan(wages(crew));
  });

  it('charting upgrades chart the way faster', () => {
    const comp = { blade: 3, mender: 0, scout: 1, mystic: 0 };
    expect(chartingPerTrip(own(fresh(), 'chartMultiplier'), eaves, comp)).toBeGreaterThan(chartingPerTrip(fresh(), eaves, comp));
  });

  it('forage upgrades yield more per tap', () => {
    expect(forage(own(fresh(), 'forageMultiplier')).relics).toBeGreaterThan(FORAGE_YIELD);
  });

  it('gleaners forage on their own', () => {
    const c = own(fresh(), 'autoForage');
    expect(autoForageRate(c)).toBeGreaterThan(0);
    expect(tickCompany(c, 1).lifetimeRelics).toBeCloseTo(autoForageRate(c) * FORAGE_YIELD);
  });
});

describe('the Quartermaster (standing orders that send themselves)', () => {
  it('cannot be used without the upgrade', () => {
    const c = staffed();
    expect(maxStandingRegions(c)).toBe(0);
    expect(toggleStanding(c, eaves.id)).toBe(c);
  });

  it('marks regions whose parties go out on their own, up to the number allowed', () => {
    const c = toggleStanding(own(staffed(), 'quartermaster'), eaves.id);
    expect(c.standing).toEqual([eaves.id]);
    expect(toggleStanding(c, eaves.id).standing).toEqual([]);
    const full = { ...c, charted: 99 };
    expect(toggleStanding(full, REGIONS[1]!.id)).toBe(full);
  });

  it('sends a standing party whenever enough rested hands are in the hall', () => {
    const c = toggleStanding(own(staffed(), 'quartermaster'), eaves.id);
    const next = tickCompany(c, 1);
    expect(next.parties.length).toBeGreaterThan(0);
    // 12 blades and 4 scouts at 3+1 per party: four go out, then the hall is empty.
    const busy = run(c, 5);
    expect(busy.parties.length).toBe(4);
  });

  it('keeps the company working while the factor is away', () => {
    const c = toggleStanding(own(staffed(), 'quartermaster'), eaves.id);
    expect(run(c, 600).lifetimeRelics).toBeGreaterThan(run(staffed(), 600).lifetimeRelics);
  });

  it('never sends hands it does not have', () => {
    const c = toggleStanding(own(fresh({ silver: 1e9 }), 'quartermaster'), eaves.id);
    expect(run(c, 30).parties).toEqual([]);
    for (const id of CLASS_IDS) expect(c.hired[id]).toBe(0);
  });

  it('stops sending to a region once it is unmarked', () => {
    let c = toggleStanding(own(staffed(), 'quartermaster'), eaves.id);
    c = toggleStanding(c, eaves.id);
    expect(tickCompany(c, 1).parties).toEqual([]);
    expect(dispatch(c, eaves.id).parties).toHaveLength(1);
  });
});

describe('Quartermaster priorities', () => {
  it('sends the deepest standing order first, so the frontier is never starved by older regions', () => {
    const hollows = REGIONS[1]!;
    let c = fresh({
      silver: 1e9,
      charted: 99,
      upgrades: ['quartermaster', 'quartermasters-clerk'],
      hired: { blade: 4, mender: 0, scout: 1, mystic: 0 },
      orders: { ...fresh().orders, [eaves.id]: { blade: 4, mender: 0, scout: 1, mystic: 0 }, [hollows.id]: { blade: 4, mender: 0, scout: 1, mystic: 0 } },
    });
    c = toggleStanding(toggleStanding(c, eaves.id), hollows.id);
    const next = tickCompany(c, 1);
    expect(next.parties.map((p) => p.region)).toEqual([hollows.id]);
  });
});
