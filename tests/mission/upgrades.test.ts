import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import { drill, oreRate, refineryCapacity, clickPower } from '../../src/mission/economy';
import { buyUpgrade, isUpgradeUnlocked, availableUpgrades } from '../../src/mission/upgrades';
import type { UpgradeDef } from '../../src/data/upgrades';
import { GENERATORS } from '../../src/data/generators';

const drone = GENERATORS[0]!;
const auger = GENERATORS[1]!;

const fresh = (patch: Partial<MissionState> = {}): MissionState => ({
  ...createMission(DEFAULT_MISSION_CONFIG, 1),
  ...patch,
});
const withGens = (gens: Record<string, number>, patch: Partial<MissionState> = {}) =>
  fresh({ generators: { ...fresh().generators, ...gens }, ...patch });

const def = (over: Partial<UpgradeDef> & Pick<UpgradeDef, 'effect'>): UpgradeDef => ({
  id: 'test',
  name: 'TEST',
  description: 'test',
  cost: 100,
  unlock: {},
  ...over,
});

describe('unlocking upgrades', () => {
  it('unlocks on lifetime ore extracted', () => {
    const u = def({ effect: { kind: 'clickMultiplier', value: 2 }, unlock: { lifetimeOre: 50 } });
    expect(isUpgradeUnlocked(fresh({ lifetimeOre: 49 }), u)).toBe(false);
    expect(isUpgradeUnlocked(fresh({ lifetimeOre: 50 }), u)).toBe(true);
  });

  it('unlocks on owning enough of a generator', () => {
    const u = def({ effect: { kind: 'clickMultiplier', value: 2 }, unlock: { generator: { id: drone.id, count: 10 } } });
    expect(isUpgradeUnlocked(withGens({ [drone.id]: 9 }), u)).toBe(false);
    expect(isUpgradeUnlocked(withGens({ [drone.id]: 10 }), u)).toBe(true);
  });

  it('lists available upgrades: unlocked and not yet owned, cheapest first', () => {
    const m = fresh({ lifetimeOre: 1e12, generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 100])) });
    const list = availableUpgrades(m);
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) expect(list[i]!.cost).toBeGreaterThanOrEqual(list[i - 1]!.cost);
    const owned = buyUpgrade({ ...m, credits: Infinity }, list[0]!.id);
    expect(availableUpgrades(owned).map((u) => u.id)).not.toContain(list[0]!.id);
  });
});

describe('buying upgrades', () => {
  const first = () => availableUpgrades(fresh({ lifetimeOre: 1e6 }))[0]!;

  it('deducts the cost and records the upgrade', () => {
    const u = first();
    const m = buyUpgrade(fresh({ lifetimeOre: 1e6, credits: u.cost + 5 }), u.id);
    expect(m.upgrades).toContain(u.id);
    expect(m.credits).toBe(5);
  });

  it('refuses when unaffordable, locked, unknown, or already owned', () => {
    const u = first();
    const poor = fresh({ lifetimeOre: 1e6, credits: u.cost - 1 });
    expect(buyUpgrade(poor, u.id)).toBe(poor);
    const locked = fresh({ credits: 1e9 });
    expect(buyUpgrade(locked, u.id)).toBe(locked);
    const rich = fresh({ lifetimeOre: 1e6, credits: 1e9 });
    expect(buyUpgrade(rich, 'nope')).toBe(rich);
    const once = buyUpgrade(rich, u.id);
    expect(buyUpgrade(once, u.id)).toBe(once);
  });
});

describe('upgrade effects', () => {
  // Effects are looked up by id from the table, so test with real entries of each kind.
  const pick = (pred: (u: UpgradeDef) => boolean) =>
    availableUpgrades(fresh({ lifetimeOre: 1e15, generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 1000])) })).find(pred)!;
  const own = (m: MissionState, ...ids: string[]) => ({ ...m, upgrades: [...m.upgrades, ...ids] });

  it('click multipliers increase ore per drill cycle', () => {
    const u = pick((x) => x.effect.kind === 'clickMultiplier');
    expect(clickPower(own(fresh(), u.id))).toBeCloseTo(u.effect.value);
    expect(drill(own(fresh(), u.id)).ore).toBeCloseTo(u.effect.value);
  });

  it('generator multipliers boost only their generator', () => {
    const u = pick((x) => x.effect.kind === 'generatorMultiplier' && x.effect.generator === drone.id);
    const m = withGens({ [drone.id]: 1, [auger.id]: 1 });
    expect(oreRate(own(m, u.id))).toBeCloseTo(drone.baseRate * u.effect.value + auger.baseRate);
  });

  it('global multipliers boost all generator output', () => {
    const u = pick((x) => x.effect.kind === 'globalMultiplier');
    const m = withGens({ [drone.id]: 1, [auger.id]: 1 });
    expect(oreRate(own(m, u.id))).toBeCloseTo((drone.baseRate + auger.baseRate) * u.effect.value);
  });

  it('refinery multipliers increase throughput', () => {
    const u = pick((x) => x.effect.kind === 'refineryMultiplier');
    expect(refineryCapacity(own(fresh(), u.id))).toBeCloseTo(refineryCapacity(fresh()) * u.effect.value);
  });

  it('telemetry assist adds a share of automated output to every drill cycle', () => {
    const u = pick((x) => x.effect.kind === 'clickRateShare');
    const m = withGens({ [auger.id]: 10 });
    expect(clickPower(own(m, u.id))).toBeCloseTo(1 + oreRate(m) * u.effect.value);
  });

  it('stacks multiplicatively', () => {
    const tiers = availableUpgrades(fresh({ lifetimeOre: 1e15, generators: { ...fresh().generators, [drone.id]: 1000 } })).filter(
      (x) => x.effect.kind === 'generatorMultiplier' && x.effect.generator === drone.id,
    );
    const m = withGens({ [drone.id]: 1 });
    const expected = tiers.reduce((acc, u) => acc * u.effect.value, drone.baseRate);
    expect(oreRate(own(m, ...tiers.map((u) => u.id)))).toBeCloseTo(expected);
  });
});
