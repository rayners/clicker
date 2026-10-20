import { describe, it, expect } from 'vitest';
import { CLASSES, type ClassId } from '../../src/forest-data/classes';
import { REGIONS } from '../../src/forest-data/regions';
import { BUILDINGS } from '../../src/forest-data/buildings';
import { createCompany, type Company } from '../../src/forest/state';
import {
  available,
  adjustOrder,
  appraisalRate,
  buildingCost,
  buyBuilding,
  delve,
  dispatch,
  forage,
  healRate,
  hire,
  hireCost,
  isRegionOpen,
  penance,
  penanceCost,
  project,
  tickCompany,
  wages,
  COST_GROWTH,
  FORAGE_YIELD,
  PENANCE_AMOUNT,
} from '../../src/forest/company';

const fresh = (patch: Partial<Company> = {}): Company => ({ ...createCompany(1), ...patch });
const eaves = REGIONS[0]!;
const hands = (counts: Partial<Record<ClassId, number>>) => ({ ...fresh().hired, ...counts });
const run = (c: Company, seconds: number, step = 1) => {
  let next = c;
  for (let t = 0; t < seconds; t += step) next = tickCompany(next, step);
  return next;
};
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe('a new charter', () => {
  it('starts with a little silver, no hands, no relics and a clean ledger', () => {
    const c = fresh();
    expect(c.silver).toBeGreaterThan(0);
    expect(sum(c.hired)).toBe(0);
    expect(c.relics).toBe(0);
    expect(c.blight).toBe(0);
    expect(c.log.length).toBeGreaterThan(0);
  });

  it('opens only the Eaves at first', () => {
    expect(isRegionOpen(fresh(), eaves)).toBe(true);
    expect(isRegionOpen(fresh(), REGIONS[1]!)).toBe(false);
  });
});

describe('foraging the eaves (the click)', () => {
  it('picks up relic shards for the vault', () => {
    const c = forage(fresh());
    expect(c.relics).toBe(FORAGE_YIELD);
    expect(c.lifetimeRelics).toBe(FORAGE_YIELD);
  });
});

describe('recruiting', () => {
  it('hires a hand for silver, each one dearer than the last', () => {
    const blade = CLASSES.find((k) => k.id === 'blade')!;
    const c = hire(fresh({ silver: 1_000 }), 'blade');
    expect(c.hired.blade).toBe(1);
    expect(c.silver).toBe(1_000 - blade.baseCost);
    expect(COST_GROWTH).toBe(1.15);
    expect(hireCost(c, 'blade')).toBe(Math.ceil(blade.baseCost * 1.15));
  });

  it('refuses a hire the company cannot afford', () => {
    const c = fresh({ silver: 0 });
    expect(hire(c, 'blade')).toBe(c);
  });

  it('pays every hand a wage, every second', () => {
    const c = fresh({ silver: 100, hired: hands({ blade: 4, mystic: 1 }) });
    expect(wages(c)).toBeCloseTo(4 * CLASSES.find((k) => k.id === 'blade')!.wage + CLASSES.find((k) => k.id === 'mystic')!.wage);
    expect(run(c, 10).silver).toBeCloseTo(100 - wages(c) * 10);
  });

  it('loses hands to desertion when wages go unpaid', () => {
    const c = run(fresh({ silver: 0, hired: hands({ blade: 10 }) }), 30);
    expect(c.hired.blade).toBeLessThan(10);
    expect(c.silver).toBe(0);
    expect(c.log.some((e) => /desert/i.test(e.text))).toBe(true);
  });
});

describe('standing orders (party composition)', () => {
  it('sets how many of each class a region party takes, one step at a time, never below zero', () => {
    let c = adjustOrder(fresh(), eaves.id, 'scout', +1);
    expect(c.orders[eaves.id]!.scout).toBe(fresh().orders[eaves.id]!.scout + 1);
    for (let i = 0; i < 10; i++) c = adjustOrder(c, eaves.id, 'mender', -1);
    expect(c.orders[eaves.id]!.mender).toBe(0);
  });

  it('projects the outcome of a composition against the region before sending it', () => {
    const weak = project(fresh(), eaves, { blade: 1, mender: 0, scout: 0, mystic: 0 });
    const strong = project(fresh(), eaves, { blade: 4, mender: 1, scout: 1, mystic: 0 });
    expect(strong.ratio).toBeGreaterThan(weak.ratio);
    expect(strong.woundRisk).toBeLessThan(weak.woundRisk);
    expect(strong.haul).toBeGreaterThan(weak.haul);
  });

  it('lets menders cut wounds, scouts speed the trip and add haul, mystics cut blight', () => {
    const base = { blade: 3, mender: 0, scout: 0, mystic: 0 };
    const p = project(fresh(), eaves, base);
    expect(project(fresh(), eaves, { ...base, mender: 2 }).woundRisk).toBeLessThan(p.woundRisk);
    expect(project(fresh(), eaves, { ...base, scout: 2 }).duration).toBeLessThan(p.duration);
    expect(project(fresh(), eaves, { ...base, scout: 2 }).haul).toBeGreaterThan(p.haul);
    expect(project(fresh(), eaves, { ...base, mystic: 2 }).blightPerHand).toBeLessThan(p.blightPerHand);
  });
});

describe('expeditions', () => {
  const ready = () =>
    fresh({
      silver: 1e6,
      hired: hands({ blade: 6, mender: 2, scout: 2, mystic: 0 }),
      orders: { ...fresh().orders, [eaves.id]: { blade: 3, mender: 1, scout: 1, mystic: 0 } },
    });

  it('sends a party on its standing order, taking those hands out of the hall', () => {
    const c = dispatch(ready(), eaves.id);
    expect(c.parties).toHaveLength(1);
    expect(available(c, 'blade')).toBe(3);
    expect(available(c, 'mender')).toBe(1);
  });

  it('refuses to send a party when there are not enough rested hands, or the order is empty', () => {
    const c = dispatch(dispatch(ready(), eaves.id), eaves.id);
    expect(c.parties).toHaveLength(2);
    expect(dispatch(c, eaves.id)).toBe(c);
    const empty = fresh({ hired: hands({ blade: 5 }), orders: { ...fresh().orders, [eaves.id]: { blade: 0, mender: 0, scout: 0, mystic: 0 } } });
    expect(dispatch(empty, eaves.id)).toBe(empty);
  });

  it('refuses regions that are not open yet', () => {
    const c = ready();
    expect(dispatch(c, REGIONS[1]!.id)).toBe(c);
  });

  it('brings back relics after the trip, with any wounded set aside to heal', () => {
    const sent = dispatch(ready(), eaves.id);
    const back = run(sent, Math.ceil(sent.parties[0]!.returnsAt) + 1);
    expect(back.parties).toHaveLength(0);
    expect(back.lifetimeRelics).toBeGreaterThan(0);
    // The wounded stay on the roster (they are still paid); only the dead leave it.
    expect(sum(back.hired)).toBeLessThanOrEqual(sum(ready().hired));
    expect(sum(back.wounded)).toBeLessThanOrEqual(sum(back.hired));
    expect(back.log.some((e) => /returns/i.test(e.text))).toBe(true);
  });

  it('resolves the same way for the same seed', () => {
    const a = run(dispatch(ready(), eaves.id), 120);
    const b = run(dispatch(ready(), eaves.id), 120);
    expect(a).toEqual(b);
  });

  it('kills and maims an underpowered party far more often than a strong one', () => {
    let weakLosses = 0;
    let strongLosses = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const base = { ...ready(), rng: seed, hired: hands({ blade: 3, mender: 1, scout: 1 }) };
      const weak = dispatch({ ...base, orders: { ...base.orders, [eaves.id]: { blade: 1, mender: 0, scout: 0, mystic: 0 } } }, eaves.id);
      const strong = dispatch(base, eaves.id);
      const after = (c: Company) => run(c, 200);
      weakLosses += 1 - sum(after(weak).hired) / sum(base.hired) + sum(after(weak).wounded) / sum(base.hired);
      strongLosses += 1 - sum(after(strong).hired) / sum(base.hired) + sum(after(strong).wounded) / sum(base.hired);
    }
    expect(weakLosses).toBeGreaterThan(strongLosses);
  });

  it('adds blight to the company for every hand that went into the wood', () => {
    const back = run(dispatch(ready(), eaves.id), 200);
    expect(back.blight).toBeGreaterThan(0);
  });
});

describe('healing and rest', () => {
  it('returns wounded hands to duty over time', () => {
    const c = fresh({ silver: 1e6, hired: hands({ blade: 5 }), wounded: { ...fresh().wounded, blade: 4 } });
    expect(available(c, 'blade')).toBe(1);
    const later = run(c, 600);
    expect(later.wounded.blade).toBeLessThan(4);
    expect(available(later, 'blade')).toBeGreaterThan(1);
  });

  it('heals faster with a better hospice', () => {
    const hospice = BUILDINGS.find((b) => b.id === 'hospice')!;
    expect(healRate(fresh({ buildings: { ...fresh().buildings, [hospice.id]: 2 } }))).toBeGreaterThan(healRate(fresh()));
  });
});

describe('appraisal (relics to silver)', () => {
  it('sells relics from the vault at the appraisal rate', () => {
    const c = fresh({ relics: 1_000, silver: 0 });
    const later = tickCompany(c, 1);
    expect(c.relics - later.relics).toBeCloseTo(appraisalRate(c));
    expect(later.silver).toBeGreaterThan(0);
  });

  it('cannot sell relics the vault does not hold', () => {
    const later = tickCompany(fresh({ relics: 0.5, silver: 0 }), 1);
    expect(later.relics).toBe(0);
  });

  it('appraises faster with a bigger appraisal house', () => {
    expect(appraisalRate(fresh({ buildings: { ...fresh().buildings, appraisal: 2 } }))).toBeGreaterThan(appraisalRate(fresh()));
  });
});

describe('blight', () => {
  it('rises while relics sit unsold in the vault', () => {
    expect(run(fresh({ relics: 50_000 }), 60).blight).toBeGreaterThan(0);
  });

  it('can be lowered by paying the Synod for penance', () => {
    const c = penance(fresh({ blight: 40, silver: 1e6 }));
    expect(c.blight).toBe(40 - PENANCE_AMOUNT);
    expect(c.silver).toBe(1e6 - penanceCost(fresh({ blight: 40 })));
  });

  it('eases slowly on its own once a chapel is built', () => {
    const chapel = fresh({ blight: 40, buildings: { ...fresh().buildings, chapel: 1 } });
    expect(run(chapel, 60).blight).toBeLessThan(40);
    expect(run(fresh({ blight: 40 }), 60).blight).toBe(40);
  });

  it('never goes below zero or above one hundred', () => {
    expect(penance(fresh({ blight: 2, silver: 1e9 })).blight).toBe(0);
    expect(run(fresh({ blight: 99.9, relics: 1e12 }), 60).blight).toBe(100);
  });
});

describe('buildings', () => {
  it('cost silver and double-ish in price each level', () => {
    const b = BUILDINGS[0]!;
    const c = buyBuilding(fresh({ silver: 1e9 }), b.id);
    expect(c.buildings[b.id]).toBe(1);
    expect(buildingCost(c, b.id)).toBeGreaterThan(buildingCost(fresh(), b.id) * 1.5);
  });
});

describe('the delve (progress)', () => {
  it('deepens as relics are recovered, opening further regions', () => {
    expect(delve(fresh())).toBe(0);
    const deep = fresh({ lifetimeRelics: 1e7 });
    expect(delve(deep)).toBeGreaterThan(delve(fresh({ lifetimeRelics: 1e3 })));
    expect(isRegionOpen(deep, REGIONS[1]!)).toBe(true);
  });
});

describe('self-containment', () => {
  it('is plain JSON so it can be saved', () => {
    const c = run(dispatch({ ...fresh({ silver: 1e6, hired: hands({ blade: 5 }) }), orders: { ...fresh().orders, [eaves.id]: { blade: 3, mender: 0, scout: 0, mystic: 0 } } }, eaves.id), 10);
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
  });
});
