import { describe, it, expect } from 'vitest';
import { veteran } from '../helpers';
import { advance, createGame, type GameState } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { deserialize, serialize } from '../../src/core/save';
import { buyHunterUpgrade, hunterRules, hunterUpgradeCost, HUNTER_ADAPTER, HUNTER_SHIPS, leaveHunter, startHunter } from '../../src/core/hunter';
import { HUNTER_UPGRADES } from '../../src/data/hunter/upgrades';
import { HUNTER_ARMED_AT, HUNTER_DRIVEN_AT } from '../../src/mission/hunter';
import { simulateHunter } from '../../src/sim/bot';
import { pushOn, shiftPush } from '../../src/engine/hunt';
import type { HunterMission } from '../../src/mission/state';

const NOW = 1_000_000;
const hunter = () => startHunter(createGame(1, NOW), 7);
const run = (g: GameState, seconds: number) => {
  let next = g;
  for (let t = 0; t < seconds; t++) next = advance(next, 1);
  return next;
};
const ship = (g: GameState, i: number) => g.hunter!.hunt.prey[i]!.mission as HunterMission;

describe('accepting the hunt', () => {
  it('sends the hunter after several contracts at once: a security detachment, a mining crew and a tug', () => {
    const g = hunter();
    expect(g.mode).toBe('hunter');
    expect(g.hunter!.hunt.prey).toHaveLength(HUNTER_SHIPS);
    expect(g.hunter!.hunt.prey.map((p) => p.mission.scenario)).toEqual(['security', 'extraction', 'haulage']);
    expect(g.hunter!.hunt.prey.every((p) => p.mission.horror === 'hunter')).toBe(true);
  });

  it('lets every contract run itself', () => {
    const g = run(hunter(), 900);
    for (const p of g.hunter!.hunt.prey) expect(p.mission.lifetimeCredits).toBeGreaterThan(0);
  });

  it('shows itself first and hunts after: trophies come from a ship it has stalked a while', () => {
    let g = hunter();
    g = { ...g, hunter: { ...g.hunter!, hunt: shiftPush(shiftPush(g.hunter!.hunt, 0, 1), 0, 1) } };
    const later = run(g, 1_200);
    expect(ship(later, 0).trophies).toBeGreaterThan(0);
    expect(ship(later, 1).alert).toBe(0);
    expect(later.hunter!.hunt.dread).toBeGreaterThan(0);
  });

  it('makes every ship better armed the more its legend spreads', () => {
    const p = hunter().hunter!.hunt.prey[0]!;
    expect(HUNTER_ADAPTER.step(p, 1, 0, 4).mission.config.productionMultiplier).toBeGreaterThan(HUNTER_ADAPTER.step(p, 1, 0, 0).mission.config.productionMultiplier);
  });

  it('spends trophies on growing: another hunter, sharper blades', () => {
    const g = hunter();
    const rich = { ...g, hunter: { ...g.hunter!, hunt: { ...g.hunter!.hunt, dread: 1e6 } } };
    const another = HUNTER_UPGRADES.find((u) => u.effect.kind === 'strength')!;
    const bought = buyHunterUpgrade(rich, another.id);
    expect(bought.hunter!.hunt.strength).toBe(g.hunter!.hunt.strength + 1);
    expect(bought.hunter!.hunt.dread).toBe(1e6 - hunterUpgradeCost(rich.hunter!, another.id));
    expect(buyHunterUpgrade(g, another.id)).toBe(g);
    const sharper = HUNTER_UPGRADES.find((u) => u.effect.kind === 'push')!;
    expect(hunterRules(buyHunterUpgrade(rich, sharper.id).hunter!).pushPerStep).toBeGreaterThan(hunterRules(rich.hunter!).pushPerStep);
  });

  it('is driven off when a crew finally turns on it: the next ship is sent, and the hunter must withdraw', () => {
    const g = hunter();
    const prey = g.hunter!.hunt.prey.map((p, i) => (i === 0 ? { ...p, mission: { ...p.mission, flags: ['terminus'] } } : p));
    const ended = advance({ ...g, hunter: { ...g.hunter!, hunt: { ...g.hunter!.hunt, prey } } }, 1);
    expect(ended.hunter!.hunt.beaten).toBe(1);
    expect(ended.hunter!.hunt.prey[0]!.contract).toBe(2);
    expect(pushOn(ended.hunter!.hunt, 0, hunterRules(ended.hunter!))).toBe(0);
  });

  it('reads how close each crew is to driving it off', () => {
    const p = hunter().hunter!.hunt.prey[0]!;
    expect(HUNTER_ADAPTER.alarm(p)).toBe(0);
    expect(HUNTER_ADAPTER.alarm({ ...p, mission: { ...p.mission, alert: HUNTER_DRIVEN_AT / 2 } as HunterMission })).toBeCloseTo(0.5);
    expect(HUNTER_ARMED_AT).toBeLessThan(HUNTER_DRIVEN_AT);
  });

  it('only runs the side that is open', () => {
    const g = hunter();
    const later = run(g, 60);
    expect(later.mission.elapsed).toBe(g.mission.elapsed);
    const back = leaveHunter(later);
    expect(back.mode).toBe('mission');
    expect(run(back, 30).hunter!.hunt.prey[0]!.mission.elapsed).toBe(later.hunter!.hunt.prey[0]!.mission.elapsed);
  });

  it('takes orders: accept, stalk, withdraw, grow, and return to the contract', () => {
    let g = reduce(veteran(createGame(1, NOW)), { type: 'startHunter', seed: 3 });
    expect(g.mode).toBe('hunter');
    g = reduce(g, { type: 'shiftHunterPush', index: 1, step: 1 });
    expect(g.hunter!.hunt.split[1]).toBe(1);
    g = reduce(g, { type: 'toggleHunterDormant' });
    expect(g.hunter!.hunt.dormant).toBe(true);
    g = reduce({ ...g, hunter: { ...g.hunter!, hunt: { ...g.hunter!.hunt, dread: 1e6 } } }, { type: 'buyHunterUpgrade', id: HUNTER_UPGRADES[0]!.id });
    expect(g.hunter!.bought[HUNTER_UPGRADES[0]!.id]).toBe(1);
    g = reduce(g, { type: 'leaveHunter' });
    expect(g.mode).toBe('mission');
  });

  it('survives a save and reload, and older saves have no hunt', () => {
    const g = run(hunter(), 30);
    const back = deserialize(serialize(g));
    expect(back.hunter!.hunt.prey[0]!.mission.elapsed).toBe(g.hunter!.hunt.prey[0]!.mission.elapsed);
    const old = createGame(1, NOW);
    const { hunter: _h, ...rest } = old;
    expect(deserialize(JSON.stringify({ ...rest, version: 6 })).hunter).toBeNull();
  });
});

describe('the hunter, played through', () => {
  it('lets a hunter that stalks out-harvest one that never does, and grow doing it', { timeout: 120_000 }, () => {
    const played = simulateHunter({ seed: 7, maxSeconds: 2 * 3600 });
    const idle = simulateHunter({ seed: 7, maxSeconds: 2 * 3600, passive: true });
    expect(played.harvest).toBeGreaterThan(idle.harvest * 1.5 + 1);
    expect(played.upgrades).toBeGreaterThan(1);
  });
});
