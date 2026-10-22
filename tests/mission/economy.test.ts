import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG } from '../../src/mission/state';
import {
  incomeGain,
  generatorRate,
  drill,
  generatorCost,
  buyGenerator,
  oreRate,
  refineryCapacity,
  refineryCost,
  buyRefinery,
  COST_GROWTH,
  ORE_PRICE,
  isGeneratorRevealed,
  creditRate,
  bottleneck,
} from '../../src/mission/extraction/economy';
import { tickMission } from '../../src/mission/tick';
import { GENERATORS } from '../../src/data/extraction/generators';

const fresh = () => createMission(DEFAULT_MISSION_CONFIG, 1);
const drone = GENERATORS[0]!;

describe('a new mission', () => {
  it('starts with no ore, no credits and no generators', () => {
    const m = fresh();
    expect(m.ore).toBe(0);
    expect(m.credits).toBe(0);
    expect(Object.values(m.generators).every((n) => n === 0)).toBe(true);
  });

  it('records which scenario and horror it is running', () => {
    expect(fresh().scenario).toBe('extraction');
    expect(fresh().horror).toBe('organism');
  });

  it('records the config it was created from', () => {
    expect(fresh().config.shipName).toBe(DEFAULT_MISSION_CONFIG.shipName);
  });
});

describe('drilling (the click)', () => {
  it('extracts one unit of ore per drill cycle', () => {
    const m = drill(fresh());
    expect(m.ore).toBe(1);
    expect(m.lifetimeOre).toBe(1);
  });

  it('does not mutate the previous state', () => {
    const before = fresh();
    drill(before);
    expect(before.ore).toBe(0);
  });
});

describe('generators', () => {
  it('cost their base price when none are owned', () => {
    expect(generatorCost(drone, 0)).toBe(drone.baseCost);
  });

  it('grow in cost by 15% per unit owned (rounded up)', () => {
    expect(COST_GROWTH).toBe(1.15);
    expect(generatorCost(drone, 3)).toBe(Math.ceil(drone.baseCost * 1.15 ** 3));
  });

  it('are bought with credits, deducting the cost', () => {
    const m = { ...fresh(), credits: 100 };
    const after = buyGenerator(m, drone.id);
    expect(after.generators[drone.id]).toBe(1);
    expect(after.credits).toBe(100 - drone.baseCost);
  });

  it('cannot be bought without enough credits', () => {
    const m = { ...fresh(), credits: drone.baseCost - 1 };
    expect(buyGenerator(m, drone.id)).toBe(m);
  });

  it('produce ore per second according to how many are owned', () => {
    const m = { ...fresh(), generators: { ...fresh().generators, [drone.id]: 4 } };
    expect(oreRate(m)).toBeCloseTo(4 * drone.baseRate);
  });
});

describe('refinery', () => {
  it('starts with a small capacity that grows with each level', () => {
    const m = fresh();
    expect(refineryCapacity(m)).toBeGreaterThan(0);
    const upgraded = buyRefinery({ ...m, credits: refineryCost(m) });
    expect(refineryCapacity(upgraded)).toBeGreaterThan(refineryCapacity(m));
    expect(upgraded.credits).toBe(0);
  });

  it('cannot be upgraded without enough credits', () => {
    const m = { ...fresh(), credits: refineryCost(fresh()) - 1 };
    expect(buyRefinery(m)).toBe(m);
  });

  it('gets more expensive with each level', () => {
    const m = fresh();
    const upgraded = buyRefinery({ ...m, credits: refineryCost(m) });
    expect(refineryCost(upgraded)).toBeGreaterThan(refineryCost(m));
  });
});

describe('ticking a mission', () => {
  it('advances mission time', () => {
    expect(tickMission(fresh(), 2.5).elapsed).toBe(2.5);
  });

  it('accumulates generator output over time', () => {
    const m = { ...fresh(), generators: { ...fresh().generators, [drone.id]: 2 } };
    const after = tickMission(m, 10);
    expect(after.lifetimeOre).toBeCloseTo(2 * drone.baseRate * 10);
  });

  it('refines ore into credits, limited by refinery capacity', () => {
    const m = { ...fresh(), ore: 1000 };
    const cap = refineryCapacity(m);
    const after = tickMission(m, 2);
    expect(after.ore).toBeCloseTo(1000 - cap * 2);
    expect(after.credits).toBeCloseTo(cap * 2 * ORE_PRICE);
  });

  it('never refines more ore than is in the hopper', () => {
    const m = { ...fresh(), ore: 1 };
    const after = tickMission(m, 10);
    expect(after.ore).toBe(0);
    expect(after.credits).toBeCloseTo(ORE_PRICE);
  });

  it('gives the same result for one long tick as for many short ones when not refinery-bound', () => {
    const base = { ...fresh(), generators: { ...fresh().generators, [drone.id]: 1 } };
    let stepped = base;
    for (let i = 0; i < 100; i++) stepped = tickMission(stepped, 0.1);
    expect(stepped.lifetimeOre).toBeCloseTo(tickMission(base, 10).lifetimeOre);
  });
});

describe('mission isolation (protects the future Boardroom layer)', () => {
  it('runs two missions side by side without sharing state', () => {
    let a = createMission(DEFAULT_MISSION_CONFIG, 1);
    let b = createMission({ ...DEFAULT_MISSION_CONFIG, shipName: 'MSV Other' }, 2);
    a = buyGenerator({ ...drill(a), credits: 1000 }, drone.id) as typeof a;
    b = tickMission(b, 5);
    expect(b.generators[drone.id]).toBe(0);
    expect(b.ore).toBe(0);
    expect(a.elapsed).toBe(0);
    expect(a.generators[drone.id]).toBe(1);
    expect(b.config.shipName).toBe('MSV Other');
  });

  it('is plain JSON data so it can be saved and run headlessly', () => {
    const m = tickMission(drill(fresh()), 1);
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});

describe('generator discovery', () => {
  it('reveals only the first tier at the start', () => {
    const m = fresh();
    expect(isGeneratorRevealed(m, 0)).toBe(true);
    expect(isGeneratorRevealed(m, 1)).toBe(false);
  });

  it('reveals one tier beyond the highest tier owned', () => {
    const m = { ...fresh(), generators: { ...fresh().generators, [GENERATORS[2]!.id]: 1 } };
    expect(isGeneratorRevealed(m, 3)).toBe(true);
    expect(isGeneratorRevealed(m, 4)).toBe(false);
  });
});

describe('income (credits per second)', () => {
  const withDrones = (n: number, patch = {}) => ({ ...fresh(), generators: { ...fresh().generators, [drone.id]: n }, ...patch });

  it('equals extraction while the refinery has spare capacity', () => {
    const m = withDrones(10);
    expect(oreRate(m)).toBeLessThan(refineryCapacity(m));
    expect(creditRate(m)).toBeCloseTo(oreRate(m) * ORE_PRICE);
    expect(bottleneck(m)).toBe('extraction');
  });

  it('is capped by the refinery once extraction outpaces it', () => {
    const m = withDrones(200);
    expect(oreRate(m)).toBeGreaterThan(refineryCapacity(m));
    expect(creditRate(m)).toBeCloseTo(refineryCapacity(m) * ORE_PRICE);
    expect(bottleneck(m)).toBe('refinery');
  });

  it('runs the refinery at full capacity while there is a stockpile of ore to work through', () => {
    const m = withDrones(0, { ore: 1_000 });
    expect(creditRate(m)).toBeCloseTo(refineryCapacity(m) * ORE_PRICE);
  });

  it('matches what a tick actually earns', () => {
    const m = withDrones(200);
    expect(tickMission(m, 1).credits - m.credits).toBeCloseTo(creditRate(m));
  });
});

describe('what a purchase does to income', () => {
  const drone = GENERATORS[0]!;
  it('shows a generator adding income while the refinery has room', () => {
    expect(incomeGain(fresh(), { generator: drone.id })).toBeCloseTo(generatorRate(fresh(), drone));
  });

  it('shows a generator adding nothing once the refinery is full, and the refinery adding it back', () => {
    const full = { ...fresh(), generators: { ...fresh().generators, [drone.id]: 10_000 } };
    expect(incomeGain(full, { generator: drone.id })).toBe(0);
    expect(incomeGain(full, { refinery: true })).toBeGreaterThan(0);
  });
});
