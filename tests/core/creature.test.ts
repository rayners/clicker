import { describe, it, expect } from 'vitest';
import { veteran } from '../helpers';
import { advance, createGame, type GameState } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { deserialize, serialize } from '../../src/core/save';
import {
  buyCreatureUpgrade,
  creatureRules,
  creatureUpgradeCost,
  CREATURE_ADAPTER,
  CREATURE_SHIPS,
  leaveCreature,
  startCreature,
} from '../../src/core/creature';
import { CREATURE_UPGRADES } from '../../src/data/creature/upgrades';
import { CREATURE_ALARM_AT } from '../../src/mission/creature';
import { simulateCreature } from '../../src/sim/bot';
import { pushOn, shiftPush } from '../../src/shared/hunt';
import type { CreatureMission } from '../../src/mission/state';

const NOW = 1_000_000;
const creature = () => startCreature(createGame(1, NOW), 7);
const run = (g: GameState, seconds: number) => {
  let next = g;
  for (let t = 0; t < seconds; t++) next = advance(next, 1).game;
  return next;
};
const ship = (g: GameState, i: number) => g.creature!.hunt.prey[i]!.mission as CreatureMission;

describe('accepting Special Order 0-77', () => {
  it('turns WARDEN inside out: the creature stalks several contracts at once, one of each kind', () => {
    const g = creature();
    expect(g.mode).toBe('creature');
    expect(g.creature!.hunt.prey).toHaveLength(CREATURE_SHIPS);
    expect(g.creature!.hunt.prey.map((p) => p.mission.scenario)).toEqual(['extraction', 'terraform', 'security']);
    expect(g.creature!.hunt.prey.every((p) => p.mission.horror === 'creature')).toBe(true);
  });

  it('lets every contract run itself: its WARDEN builds and buys without the player', () => {
    const g = run(creature(), 900);
    for (const p of g.creature!.hunt.prey) expect(p.mission.credits + p.mission.lifetimeCredits).toBeGreaterThan(0);
    expect(ship(g, 0).lifetimeCredits).toBeGreaterThan(0);
  });

  it('takes from a contract it stalks and leaves the others alone', () => {
    let g = creature();
    g = { ...g, creature: { ...g.creature!, hunt: shiftPush(shiftPush(g.creature!.hunt, 0, 1), 0, 1) } };
    const later = run(g, 900);
    expect(ship(later, 0).taken).toBeGreaterThan(0);
    expect(ship(later, 1).taken).toBe(0);
    expect(later.creature!.hunt.dread).toBeGreaterThan(0);
  });

  it('makes the Combine pay for better-run ships the more the crews whisper about it', () => {
    const p = creature().creature!.hunt.prey[0]!;
    expect(CREATURE_ADAPTER.step(p, 1, 0, 4).mission.config.productionMultiplier).toBeGreaterThan(
      CREATURE_ADAPTER.step(p, 1, 0, 0).mission.config.productionMultiplier,
    );
  });

  it('spends biomass on growing: another brood, a faster hunt', () => {
    const g = creature();
    const rich = { ...g, creature: { ...g.creature!, hunt: { ...g.creature!.hunt, dread: 1e6 } } };
    const brood = CREATURE_UPGRADES.find((u) => u.effect.kind === 'strength')!;
    const bought = buyCreatureUpgrade(rich, brood.id);
    expect(bought.creature!.hunt.strength).toBe(g.creature!.hunt.strength + 1);
    expect(bought.creature!.hunt.dread).toBe(1e6 - creatureUpgradeCost(rich.creature!, brood.id));
    expect(buyCreatureUpgrade(g, brood.id)).toBe(g);
    const faster = CREATURE_UPGRADES.find((u) => u.effect.kind === 'push')!;
    expect(creatureRules(buyCreatureUpgrade(rich, faster.id).creature!).pushPerStep).toBeGreaterThan(creatureRules(rich.creature!).pushPerStep);
  });

  it('is beaten back when a WARDEN vents its decks: a new ship is sent, and the creature must lie low', () => {
    const g = creature();
    const prey = g.creature!.hunt.prey.map((p, i) => (i === 0 ? { ...p, mission: { ...p.mission, flags: ['terminus'] } } : p));
    const ended = advance({ ...g, creature: { ...g.creature!, hunt: { ...g.creature!.hunt, prey } } }, 1).game;
    expect(ended.creature!.hunt.beaten).toBe(1);
    expect(ended.creature!.hunt.prey[0]!.contract).toBe(2);
    expect(ship(ended, 0).flags).not.toContain('terminus');
    expect(pushOn(ended.creature!.hunt, 0, creatureRules(ended.creature!))).toBe(0);
  });

  it('reads how close each WARDEN is to working it out', () => {
    const p = creature().creature!.hunt.prey[0]!;
    expect(CREATURE_ADAPTER.alarm(p)).toBe(0);
    expect(CREATURE_ADAPTER.alarm({ ...p, mission: { ...p.mission, suspicion: CREATURE_ALARM_AT / 2 } as CreatureMission })).toBeCloseTo(0.5);
  });

  it('only runs the side that is open: the player\'s own contract waits while the creature hunts', () => {
    const g = creature();
    const later = run(g, 60);
    expect(later.mission.elapsed).toBe(g.mission.elapsed);
    const back = leaveCreature(later);
    expect(back.mode).toBe('mission');
    expect(run(back, 30).creature!.hunt.prey[0]!.mission.elapsed).toBe(later.creature!.hunt.prey[0]!.mission.elapsed);
  });

  it('takes orders: accept, stalk, lie dormant, grow, and return to the contract', () => {
    let g = reduce(veteran(createGame(1, NOW)), { type: 'startCreature', seed: 3 });
    expect(g.mode).toBe('creature');
    g = reduce(g, { type: 'shiftCreaturePush', index: 1, step: 1 });
    expect(g.creature!.hunt.split[1]).toBe(1);
    g = reduce(g, { type: 'toggleCreatureDormant' });
    expect(g.creature!.hunt.dormant).toBe(true);
    g = reduce(g, { type: 'leaveCreature' });
    expect(g.mode).toBe('mission');
  });

  it('survives a save and reload, and old saves open on the contract', () => {
    const g = run(creature(), 30);
    const back = deserialize(serialize(g));
    expect(back.creature!.hunt.prey[0]!.mission.elapsed).toBe(g.creature!.hunt.prey[0]!.mission.elapsed);
    const old = createGame(1, NOW);
    const loaded = deserialize(JSON.stringify({ ...old, version: 5, mode: undefined, creature: undefined }));
    expect(loaded.mode).toBe('mission');
    expect(loaded.creature).toBeNull();
  });
});

describe('the creature, played through', () => {
  it('lets a hunting creature out-harvest one that never stalks, and grow doing it', { timeout: 120_000 }, () => {
    const played = simulateCreature({ seed: 7, maxSeconds: 2 * 3600 });
    const idle = simulateCreature({ seed: 7, maxSeconds: 2 * 3600, passive: true });
    expect(played.harvest).toBeGreaterThan(idle.harvest * 1.5 + 1);
    expect(played.upgrades).toBeGreaterThan(1);
  });
});
