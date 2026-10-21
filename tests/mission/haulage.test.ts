import { describe, it, expect } from 'vitest';
import { createMission, HAULAGE_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { SCENARIOS } from '../../src/mission/registry';
import { BEACON_LEG, CARS, ENGINES, TUG_MASS, TUG_VALUE, stationName } from '../../src/data/haulage/systems';
import { HAULAGE_UPGRADES } from '../../src/data/haulage/upgrades';
import {
  buyCar,
  buyEngine,
  buyHaulageUpgrade,
  carCost,
  deliveryPay,
  effectiveBurn,
  engineCost,
  fireThrusters,
  fuelForLeg,
  isAutopilotActive,
  legDistance,
  legWindow,
  progress,
  refuel,
  safeBurn,
  setBurn,
  speed,
  thrust,
  toggleAutopilot,
  trainMass,
  trainValue,
} from '../../src/mission/haulage/economy';

type H = MissionOf<'haulage', 'organism'>;
const fresh = (patch: Partial<H> = {}): H => ({ ...createMission(HAULAGE_MISSION_CONFIG, 1), ...patch });
const run = <M extends H>(m: M, seconds: number): M => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1) as M;
  return next;
};
const rcs = ENGINES[0]!;
const booster = ENGINES[1]!;
const hopper = CARS[0]!;
/** A tug under way with engines, a car or two, a full tank and money in hand. */
const underway = (patch: Partial<H> = {}) =>
  fresh({ engines: { ...fresh().engines, booster: 2 }, cars: { ...fresh().cars, hopper: 2 }, fuel: 1_000, credits: 1_000, ...patch });
const upgrade = (kind: string) => HAULAGE_UPGRADES.find((u) => u.effect.kind === kind)!;

describe('the haul at the start', () => {
  it('is the tug alone at the first station\'s approach: no engines, no cars, no fuel, nothing delivered', () => {
    const m = fresh();
    expect(m.scenario).toBe('haulage');
    expect(m.leg).toBe(0);
    expect(thrust(m)).toBe(0);
    expect(trainValue(m)).toBe(TUG_VALUE);
    expect(trainMass(m)).toBe(TUG_MASS);
    expect(m.fuel).toBe(0);
    expect(m.delivered).toBe(0);
  });

  it('moves on manual thruster bursts alone, burning no fuel', () => {
    const m = fireThrusters(fireThrusters(fresh()));
    expect(m.travelled).toBeGreaterThan(0);
    expect(m.fuel).toBe(0);
  });

  it('delivers at the end of the leg: pays for the freight hauled, and docks at the next station', () => {
    let m = fresh();
    while (m.leg === 0) m = fireThrusters(m);
    expect(m.credits).toBeGreaterThan(0);
    expect(m.delivered).toBe(m.credits);
    expect(m.docked).toBeGreaterThan(0);
    expect(m.travelled).toBe(0);
    expect(m.log.at(-1)!.text).toContain(stationName(0));
  });
});

describe('engines, cars and the burn', () => {
  it('sells engines and cars at rising prices', () => {
    const m = buyEngine(fresh({ credits: 100 }), rcs.id);
    expect(m.engines[rcs.id]).toBe(1);
    expect(m.credits).toBe(100 - engineCost(rcs, 0));
    expect(engineCost(rcs, 1)).toBeGreaterThan(engineCost(rcs, 0));
    const c = buyCar(fresh({ credits: 100 }), hopper.id);
    expect(c.cars[hopper.id]).toBe(1);
    expect(carCost(hopper, 1)).toBeGreaterThan(carCost(hopper, 0));
    expect(buyEngine(fresh(), booster.id).engines[booster.id]).toBe(0);
  });

  it('goes faster with more thrust and hotter burns, slower with every car coupled on', () => {
    const m = underway();
    expect(speed(buyEngine(m, rcs.id), m.burn)).toBeGreaterThan(speed(m, m.burn));
    expect(speed(m, 8)).toBeGreaterThan(speed(m, 4));
    expect(speed(buyCar(m, hopper.id), m.burn)).toBeLessThan(speed(m, m.burn));
  });

  it('pays more per delivery for every car, and burns fuel to get there', () => {
    const light = run(underway({ cars: { ...fresh().cars, hopper: 1 } }), 200);
    const heavy = run(underway({ cars: { ...fresh().cars, hopper: 4 } }), 400);
    expect(light.leg).toBeGreaterThan(0);
    expect(heavy.leg).toBeGreaterThan(0);
    expect(heavy.delivered / heavy.leg).toBeGreaterThan(light.delivered / light.leg);
    expect(light.fuel).toBeLessThan(1_000);
  });

  it('burns fuel faster than it gains speed: a hot burn costs more per leg', () => {
    const m = underway();
    expect(fuelForLeg(setBurn(m, 8))).toBeGreaterThan(fuelForLeg(setBurn(m, 4)));
    expect(setBurn(m, 99).burn).toBe(10);
    expect(setBurn(m, 0).burn).toBe(1);
  });

  it('strains the freight past the safe burn, and damaged freight pays less', () => {
    // Checked part-way down the leg: fresh freight loads at every station.
    const gentle = run(setBurn(underway(), safeBurn(underway())), 10);
    const hard = run(setBurn(underway(), 10), 10);
    expect(hard.leg).toBe(0);
    expect(gentle.condition).toBe(1);
    expect(hard.condition).toBeLessThan(1);
    expect(deliveryPay(hard)).toBeLessThan(deliveryPay({ ...hard, condition: 1 }));
  });

  it('coasts when the tank runs dry, and only manual bursts move it', () => {
    const dry = run(underway({ fuel: 0 }), 30);
    expect(dry.travelled).toBe(0);
    expect(fireThrusters(dry).travelled).toBeGreaterThan(0);
  });
});

describe('stations and windows', () => {
  it('lengthens every leg, and gives each a delivery window', () => {
    expect(legDistance(1)).toBeGreaterThan(legDistance(0));
    expect(legWindow(fresh(), 3)).toBeGreaterThan(legWindow(fresh(), 0));
  });

  it('pays a bonus for arriving inside the window', () => {
    const quick = run(underway({ engines: { ...fresh().engines, booster: 30 } }), 120);
    const slow = underway({ legTime: 10_000, travelled: legDistance(0) - 0.01 });
    const late = run(slow, 1);
    expect(quick.onTime).toBeGreaterThan(0);
    expect(late.onTime).toBe(0);
    expect(late.leg).toBe(1);
  });

  it('refuels only at a station, enough for the next leg at the current burn', () => {
    expect(refuel(underway({ fuel: 0 }))).toEqual(underway({ fuel: 0 }));
    const docked = underway({ fuel: 0, docked: 5 });
    const filled = refuel(docked);
    expect(filled.fuel).toBeCloseTo(fuelForLeg(docked));
    expect(filled.credits).toBeLessThan(docked.credits);
  });

  it('leaves the dock on its own after a short stop', () => {
    const later = run(underway({ docked: 5, leg: 1 }), 10);
    expect(later.docked).toBe(0);
    expect(later.travelled).toBeGreaterThan(0);
  });

  it('answers the beacon on the way home: past it, the story has deep access', () => {
    expect(SCENARIOS.haulage.signals(fresh({ leg: BEACON_LEG })).deepAccess).toBe(false);
    expect(SCENARIOS.haulage.signals(fresh({ leg: BEACON_LEG + 1 })).deepAccess).toBe(true);
  });
});

describe('automation', () => {
  it('lets WARDEN fire the thrusters on a timer', () => {
    const timer = upgrade('autoThrusters');
    const m = run(fresh({ upgrades: [timer.id] }), 5);
    expect(m.travelled + m.leg).toBeGreaterThan(0);
  });

  it('lets drone loaders refuel the tug at every dock', () => {
    const loaders = upgrade('droneLoaders');
    let m = underway({ upgrades: [loaders.id], fuel: 1_000 });
    while (m.leg === 0) m = run(m, 1);
    expect(m.fuel).toBeGreaterThanOrEqual(fuelForLeg(m) - 1e-9);
  });

  it('lets WARDEN\'s autopilot hold the burn: never past the strain line, and the player can take it back', () => {
    const ap = upgrade('autopilot');
    const m = underway({ upgrades: [ap.id], burn: 10 });
    expect(isAutopilotActive(m)).toBe(true);
    expect(effectiveBurn(m)).toBeLessThanOrEqual(safeBurn(m));
    const manual = toggleAutopilot(m);
    expect(isAutopilotActive(manual)).toBe(false);
    expect(effectiveBurn(manual)).toBe(10);
    expect(toggleAutopilot(fresh())).toEqual(fresh());
  });

  it('sells requisitions once unlocked, once each', () => {
    const shocks = upgrade('safeBurn');
    const rich = fresh({ credits: 1e6, delivered: 1e6 });
    const bought = buyHaulageUpgrade(rich, shocks.id);
    expect(bought.upgrades).toContain(shocks.id);
    expect(safeBurn(bought)).toBe(safeBurn(rich) + 1);
    expect(buyHaulageUpgrade(bought, shocks.id)).toBe(bought);
    expect(buyHaulageUpgrade(fresh({ credits: 1e6 }), shocks.id).upgrades).toEqual([]);
  });
});

describe('the story scale', () => {
  it('measures progress by freight delivered, on the shared scale', () => {
    expect(progress(fresh())).toBe(0);
    expect(progress(fresh({ delivered: 1e6 }))).toBeGreaterThan(progress(fresh({ delivered: 1e4 })));
  });
});
