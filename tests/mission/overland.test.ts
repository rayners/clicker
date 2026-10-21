import { describe, it, expect } from 'vitest';
import { createMission, OVERLAND_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { SCENARIOS } from '../../src/mission/registry';
import { DEPOTS, RIG_ENGINES, ROAD_LEGS, TRAILERS } from '../../src/data/overland/systems';
import { buyCar, buyEngine, fireThrusters, legDistance, thrust } from '../../src/mission/haulage/economy';

type L = MissionOf<'overland', 'quiet'>;
const fresh = (patch: Partial<L> = {}): L => ({ ...createMission(OVERLAND_MISSION_CONFIG, 1), ...patch });
const run = <M extends L>(m: M, seconds: number): M => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1) as M;
  return next;
};

describe('the overland haul', () => {
  it('is a crawler rig at the mine with nothing going wrong: no horror, its own engines and trailers', () => {
    const m = fresh();
    expect(m.scenario).toBe('overland');
    expect(m.horror).toBe('quiet');
    expect(m.engines).toEqual(Object.fromEntries(RIG_ENGINES.map((e) => [e.id, 0])));
    expect(m.cars).toEqual(Object.fromEntries(TRAILERS.map((c) => [c.id, 0])));
  });

  it('runs on the haulage rules with its own fleet', () => {
    const m = buyCar(buyEngine(fresh({ credits: 1_000 }), RIG_ENGINES[0]!.id), TRAILERS[0]!.id);
    expect(thrust(m)).toBeGreaterThan(0);
    expect(m.cars[TRAILERS[0]!.id]).toBe(1);
    expect(fireThrusters(fresh()).travelled).toBeGreaterThan(0);
  });

  it('logs each depot by name as the rig arrives', () => {
    let m = fresh();
    while (m.leg === 0) m = fireThrusters(m);
    expect(m.log.some((e) => e.text.includes(DEPOTS[0]!))).toBe(true);
  });

  it('ends at the space elevator: reaching the last depot opens the terminus, with the promotion on offer', () => {
    const almost = fresh({ leg: ROAD_LEGS - 1, travelled: legDistance(fresh(), ROAD_LEGS - 1) - 0.01, elapsed: 3_000 });
    const arrived = run(fireThrusters(almost), 300);
    expect(arrived.flags).toContain('terminus');
    expect(arrived.log.some((e) => /long-haul contract/i.test(e.text))).toBe(true);
  });

  it('never gives the story deep access: the road has no beacon, and the contract stays in act 1', () => {
    expect(SCENARIOS.overland.signals(fresh({ leg: 99, delivered: 1e12 })).deepAccess).toBe(false);
    expect(run(fresh({ delivered: 1e9 }), 60).act).toBe(1);
  });
});
