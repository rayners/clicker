import { describe, it, expect } from 'vitest';
import { FLOORS } from '../../src/forest-data/keep';
import { REGIONS } from '../../src/forest-data/regions';
import { createCompany, type Company } from '../../src/forest/state';
import {
  available,
  buyOil,
  dispatch,
  keepFrontier,
  keepPressure,
  keepProject,
  floorStores,
  oilPerTrip,
  OIL_PRICE,
  post,
  tickCompany,
  toggleStanding,
  KEEP,
} from '../../src/forest/company';
import { held } from '../../src/shared/ground';
import { createForestGame } from '../../src/forest/game';
import { startWood } from '../../src/forest/wood';
import { forestSaves } from '../../src/forest/save';
import { reduce } from '../../src/forest/store';

const keep = (patch: Partial<Company> = {}): Company => ({ ...createCompany(1, undefined, 'keep'), ...patch });
const run = (c: Company, seconds: number) => {
  let next = c;
  for (let t = 0; t < seconds; t++) next = tickCompany(next, 1);
  return next;
};
const blades = (n: number, extra: Partial<Company> = {}) => keep({ hired: { blade: n, mender: 1, scout: 1, mystic: 0 }, silver: 10_000, ...extra });
const secured = (n: number) => FLOORS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));

describe('a charter for Morrowgate Keep', () => {
  it('starts at the drowned castle: every floor unentered, no oil, and one standing order for the assault', () => {
    const c = keep();
    expect(c.site).toBe('keep');
    expect(c.floors).toHaveLength(FLOORS.length);
    expect(held(c.floors)).toBe(0);
    expect(c.oil).toBe(0);
    expect(c.orders[KEEP]).toBeDefined();
  });

  it('sends parties only into the keep, and forest charters only into the wood', () => {
    const c = blades(10, { oil: 100 });
    expect(dispatch(c, REGIONS[0]!.id)).toBe(c);
    expect(dispatch(c, KEEP).parties).toHaveLength(1);
    const forest = { ...createCompany(1), hired: c.hired, oil: 100 };
    expect(dispatch(forest, KEEP)).toBe(forest);
  });

  it('buys lamp oil in town with thalers', () => {
    const c = keep({ silver: 100 });
    const bought = buyOil(c, 20);
    expect(bought.oil).toBe(20);
    expect(bought.silver).toBe(100 - 20 * OIL_PRICE);
    expect(buyOil(keep({ silver: 1 }), 20).oil).toBe(0);
  });

  it('burns oil for every hand sent, and more the deeper the frontier floor', () => {
    const c = blades(10, { oil: 100 });
    const order = c.orders[KEEP]!;
    const sent = dispatch(c, KEEP);
    expect(sent.oil).toBeCloseTo(100 - oilPerTrip(c, order));
    const deeper = { ...c, floors: secured(4) };
    expect(oilPerTrip(deeper, order)).toBeGreaterThan(oilPerTrip(c, order));
  });

  it('sends a party short of oil into the dark, where far more of them are hurt', () => {
    let c = blades(20, { floors: secured(2) });
    c = { ...c, orders: { ...c.orders, [KEEP]: { blade: 15, mender: 0, scout: 0, mystic: 0 } } };
    const order = c.orders[KEEP]!;
    expect(keepProject(c, order, 1).woundRisk).toBeGreaterThan(keepProject(c, order, 0).woundRisk * 1.5);
    expect(dispatch(c, KEEP).parties[0]!.dark).toBe(1);
    expect(dispatch({ ...c, oil: 1000 }, KEEP).parties[0]!.dark).toBe(0);
  });

  it('takes the frontier floor with returning parties, and counts the delve from the deepest floor taken', () => {
    let c = blades(20, { oil: 1000 });
    c = { ...c, orders: { ...c.orders, [KEEP]: { blade: 6, mender: 1, scout: 1, mystic: 0 } } };
    for (let i = 0; i < 6; i++) c = run(dispatch(c, KEEP), 40);
    expect(c.floors[0]!.secured).toBe(true);
    expect(keepFrontier(c)).toBeGreaterThan(0);
    expect(c.charted).toBe(FLOORS[keepFrontier(c) - 1]!.leagues);
    expect(c.lifetimeRelics).toBeGreaterThan(0);
  });

  it('posts blades on a taken floor: they leave the hall, and hold it while their strength covers its threat', () => {
    const c = blades(10, { floors: secured(2) });
    const posted = post(post(c, 0, 1), 0, 1);
    expect(posted.posted[0]).toBe(2);
    expect(available(posted, 'blade')).toBe(available(c, 'blade') - 2);
    expect(post(c, 5, 1)).toBe(c);
    const later = run(posted, 900);
    expect(later.floors[0]!.secured).toBe(true);
    expect(later.floors[1]!.secured).toBe(false);
    expect(keepFrontier(later)).toBe(1);
  });

  it('pays from the stores of every floor held', () => {
    const c = keep({ floors: secured(3) });
    expect(floorStores(c)).toBeCloseTo(FLOORS[0]!.stores + FLOORS[1]!.stores + FLOORS[2]!.stores);
    expect(run(c, 10).lifetimeRelics).toBeGreaterThan(0);
  });

  it('presses harder on unguarded floors as blight rises', () => {
    expect(keepPressure(keep({ blight: 60 }))).toBeGreaterThan(keepPressure(keep({ blight: 0 })));
    const clean = run(keep({ floors: secured(3) }), 120);
    const blighted = run(keep({ floors: secured(3), blight: 60 }), 120);
    expect(blighted.floors[0]!.control).toBeLessThan(clean.floors[0]!.control);
  });

  it('keeps its garrison: posted hands are the first to turn when blight runs high', () => {
    const c = blades(12, { floors: secured(2), blight: 100 });
    const posted = Array.from({ length: 8 }).reduce<Company>((x) => post(x, 0, 1), c);
    const later = run(posted, 600);
    expect(later.turned).toBeGreaterThan(0);
    expect(later.posted[0]).toBeLessThan(8);
  });

  it('finds the Key in the undercroft: deep assaults can bring back a fragment', () => {
    const deep = FLOORS.findIndex((f) => f.fragment > 0);
    let c = blades(400, { hired: { blade: 400, mender: 20, scout: 20, mystic: 0 }, floors: secured(deep), oil: 1e6, silver: 1e9, buildings: { appraisal: 0, armoury: 10, hospice: 0, chapel: 0 } });
    c = { ...c, orders: { ...c.orders, [KEEP]: { blade: 60, mender: 1, scout: 1, mystic: 0 } } };
    // Holding the floors above is another test's business: keep them held, so every trip is to the deep floor.
    for (let i = 0; i < 20 && c.keyFragments === 0; i++) {
      c = dispatch({ ...c, floors: secured(deep) }, KEEP);
      while (c.parties.length > 0) c = tickCompany({ ...c, floors: secured(deep) }, 1);
    }
    expect(c.keyFragments).toBeGreaterThan(0);
  });

  it('lets the Quartermaster send the keep order on its own, buying the oil it needs', () => {
    let c = blades(20, { upgrades: ['quartermaster'] });
    c = toggleStanding(c, KEEP);
    expect(c.standing).toContain(KEEP);
    const later = tickCompany(c, 1);
    expect(later.parties).toHaveLength(1);
    expect(later.parties[0]!.dark).toBe(0);
  });

  it('survives a save and reload, and old saves (the wood\'s companies included) open as forest charters', () => {
    const g = { ...createForestGame(1, 0), company: run(blades(10, { oil: 50 }), 5) };
    const back = forestSaves.deserialize(forestSaves.serialize(g));
    expect(back.company.site).toBe('keep');
    expect(back.company.oil).toBe(g.company.oil);
    const strip = (company: Company) => {
      const { site: _s, floors: _f, posted: _p, oil: _o, ...rest } = company;
      const orders: Record<string, unknown> = { ...rest.orders };
      delete orders[KEEP];
      return { ...rest, orders };
    };
    const old = startWood(createForestGame(1, 0), 3);
    const wood = { ...old.wood!, hunt: { ...old.wood!.hunt, prey: old.wood!.hunt.prey.map((p) => ({ ...p, company: strip(p.company) })) } };
    const loaded = forestSaves.deserialize(JSON.stringify({ ...old, version: 7, company: strip(old.company), wood }));
    for (const c of [loaded.company, ...loaded.wood!.hunt.prey.map((p) => p.company)]) {
      expect(c.site).toBe('forest');
      expect(c.floors).toEqual([]);
      expect(c.posted).toEqual([]);
      expect(c.oil).toBe(0);
      expect(c.orders[KEEP]).toBeDefined();
    }
  });

  it('takes orders: buy oil, post a blade, call one back', () => {
    const g = { ...createForestGame(1, 0), company: blades(5, { floors: secured(1) }) };
    const oiled = reduce(g, { type: 'buyOil', flasks: 10 });
    expect(oiled.company.oil).toBe(10);
    const posted = reduce(oiled, { type: 'post', floor: 0, step: 1 });
    expect(posted.company.posted[0]).toBe(1);
    expect(reduce(posted, { type: 'post', floor: 0, step: -1 }).company.posted[0]).toBe(0);
  });
});
