import { describe, it, expect } from 'vitest';
import { advance, createFathomGame, type FathomGame } from '../../src/fathom/game';
import { createOutfit } from '../../src/fathom/state';
import { tickOutfit } from '../../src/fathom/tick';
import { buyDeepUpgrade, DEEP_ADAPTER, DEEP_TOWNS, deepRules, deepUpgradeCost, leaveDeep, startDeep } from '../../src/fathom/deep';
import { DEEP_UPGRADES } from '../../src/fathom-data/deep-upgrades';
import { CITIES } from '../../src/fathom-data/breach';
import { ATTRACTIONS } from '../../src/fathom-data/shallows';
import { reduce } from '../../src/fathom/store';
import { fathomSaves } from '../../src/fathom/save';
import { simulateDeep } from '../../src/fathom/bot';
import { pushOn, shiftPush } from '../../src/shared/hunt';

const NOW = 1_000_000;
const deep = () => startDeep(createFathomGame(1, NOW), 7);
const run = (g: FathomGame, seconds: number) => {
  let next = g;
  for (let t = 0; t < seconds; t++) next = advance(next, 1);
  return next;
};
const drowned = (g: FathomGame, i: number) => g.deep!.hunt.prey[i]!.outfit.bodyCount;

describe('the Source pushing on a season', () => {
  it('makes the water more dangerous everywhere, and does nothing in an ordinary season', () => {
    const crowded = { ...createOutfit(1), attractions: { ...createOutfit(1).attractions, [ATTRACTIONS[0]!.id]: 40 }, open: 10 };
    expect(crowded.deepPush).toBe(0);
    const tally = (push: number) => {
      let o = { ...crowded, deepPush: push };
      for (let t = 0; t < 1_200; t++) o = tickOutfit(o, 1);
      return o.bodyCount;
    };
    expect(tally(3)).toBeGreaterThan(tally(0));
  });

  it('presses the kaiju harder on the coast', () => {
    const coast = (push: number) => {
      let o = { ...createOutfit(1), flags: ['breach'], deepPush: push };
      for (let t = 0; t < 60; t++) o = tickOutfit(o, 1);
      return o.cities.reduce((s, c) => s + c.control, 0);
    };
    expect(coast(3)).toBeLessThan(coast(0));
  });
});

describe('answering the Source', () => {
  it('turns the sonar around: the Source hungers after several towns at once', () => {
    const g = deep();
    expect(g.mode).toBe('deep');
    expect(g.deep!.hunt.prey).toHaveLength(DEEP_TOWNS.length);
    expect(new Set(g.deep!.hunt.prey.map((p) => p.town)).size).toBe(DEEP_TOWNS.length);
  });

  it('lets every town run its own season: passes sold, attractions bought, without the player', () => {
    const g = run(deep(), 900);
    for (const p of g.deep!.hunt.prey) expect(p.outfit.lifetimeCash).toBeGreaterThan(0);
  });

  it('drowns more in a town it pushes than in one it leaves alone, and counts them as its harvest', () => {
    let g = deep();
    g = { ...g, deep: { ...g.deep!, hunt: shiftPush(shiftPush(shiftPush(g.deep!.hunt, 0, 1), 0, 1), 0, 1) } };
    const later = run(g, 3_600);
    expect(drowned(later, 0)).toBeGreaterThan(drowned(later, 1));
    expect(later.deep!.hunt.dread).toBeGreaterThan(0);
  });

  it('counts a fallen city as a great many drowned', () => {
    const p = deep().deep!.hunt.prey[0]!;
    const held = { ...p, outfit: { ...p.outfit, cities: CITIES.map(() => ({ control: 1, garrison: 0, secured: true })) } };
    const fallen = { ...held, outfit: { ...held.outfit, cities: held.outfit.cities.map((c, i) => (i === 0 ? { ...c, control: 0, secured: false } : c)) } };
    expect(DEEP_ADAPTER.harvest(held, fallen)).toBeGreaterThanOrEqual(25);
  });

  it('makes towns richer, and so better defended, the more the sightings pile up', () => {
    const p = deep().deep!.hunt.prey[0]!;
    expect(DEEP_ADAPTER.step(p, 1, 1, 4).outfit.terms.standing).toBeGreaterThan(DEEP_ADAPTER.step(p, 1, 1, 0).outfit.terms.standing);
  });

  it('spends the drowned on growing: another current of strength, colder water', () => {
    const g = deep();
    const rich = { ...g, deep: { ...g.deep!, hunt: { ...g.deep!.hunt, dread: 1e6 } } };
    const current = DEEP_UPGRADES.find((u) => u.effect.kind === 'strength')!;
    const bought = buyDeepUpgrade(rich, current.id);
    expect(bought.deep!.hunt.strength).toBe(g.deep!.hunt.strength + 1);
    expect(bought.deep!.hunt.dread).toBe(1e6 - deepUpgradeCost(rich.deep!, current.id));
    expect(buyDeepUpgrade(g, current.id)).toBe(g);
    const cold = DEEP_UPGRADES.find((u) => u.effect.kind === 'push')!;
    expect(deepRules(buyDeepUpgrade(rich, cold.id).deep!).pushPerStep).toBeGreaterThan(deepRules(rich.deep!).pushPerStep);
  });

  it('is beaten back when a town reaches its season\'s end: that town\'s next season comes, and the Source must sink', () => {
    const g = deep();
    const prey = g.deep!.hunt.prey.map((p, i) => (i === 0 ? { ...p, outfit: { ...p.outfit, flags: ['terminus'] } } : p));
    const ended = advance({ ...g, deep: { ...g.deep!, hunt: { ...g.deep!.hunt, prey } } }, 1);
    expect(ended.deep!.hunt.beaten).toBe(1);
    expect(ended.deep!.hunt.prey[0]!.outfit.terms.season).toBe(2);
    expect(ended.deep!.hunt.prey[0]!.town).toBe(g.deep!.hunt.prey[0]!.town);
    expect(pushOn(ended.deep!.hunt, 0, deepRules(ended.deep!))).toBe(0);
  });

  it('only runs the side of the sonar that is open', () => {
    const g = deep();
    const later = run(g, 60);
    expect(later.outfit.elapsed).toBe(g.outfit.elapsed);
    const back = leaveDeep(later);
    expect(back.mode).toBe('season');
    expect(run(back, 30).deep!.hunt.prey[0]!.outfit.elapsed).toBe(later.deep!.hunt.prey[0]!.outfit.elapsed);
  });

  it('takes orders: answer, push, sink, grow, and return to the season', () => {
    let g = reduce(createFathomGame(1, NOW), { type: 'startDeep', seed: 3 });
    expect(g.mode).toBe('deep');
    g = reduce(g, { type: 'shiftDeepPush', index: 1, step: 1 });
    expect(g.deep!.hunt.split[1]).toBe(1);
    g = reduce(g, { type: 'toggleDeepDormant' });
    expect(g.deep!.hunt.dormant).toBe(true);
    g = reduce({ ...g, deep: { ...g.deep!, hunt: { ...g.deep!.hunt, dread: 1e6 } } }, { type: 'buyDeepUpgrade', id: DEEP_UPGRADES[0]!.id });
    expect(g.deep!.bought[DEEP_UPGRADES[0]!.id]).toBe(1);
    g = reduce(g, { type: 'leaveDeep' });
    expect(g.mode).toBe('season');
  });

  it('survives a save and reload, and older saves open on the season', () => {
    const g = run(deep(), 30);
    const back = fathomSaves.deserialize(fathomSaves.serialize(g));
    expect(back.deep!.hunt.prey[0]!.outfit.elapsed).toBe(g.deep!.hunt.prey[0]!.outfit.elapsed);
    const old = createFathomGame(1, NOW);
    const { deepPush: _ignored, ...outfit } = old.outfit;
    const loaded = fathomSaves.deserialize(JSON.stringify({ ...old, version: 2, mode: undefined, deep: undefined, outfit }));
    expect(loaded.mode).toBe('season');
    expect(loaded.deep).toBeNull();
    expect(loaded.outfit.deepPush).toBe(0);
  });
});

describe('the Source, played through', () => {
  it('lets a hungry Source out-harvest one that never pushes, and grow doing it', { timeout: 60_000 }, () => {
    const played = simulateDeep({ seed: 7, maxSeconds: 2 * 3600 });
    const idle = simulateDeep({ seed: 7, maxSeconds: 2 * 3600, passive: true });
    expect(played.harvest).toBeGreaterThan(idle.harvest * 1.5);
    expect(played.upgrades).toBeGreaterThan(1);
  });
});
