import { describe, it, expect } from 'vitest';
import { advance, createForestGame, type ForestGame } from '../../src/forest/game';
import { createCompany } from '../../src/forest/state';
import { project } from '../../src/forest/company';
import { REGIONS } from '../../src/forest-data/regions';
import { buyWoodUpgrade, leaveWood, startWood, woodRules, woodUpgradeCost, WOOD_ADAPTER, WOOD_COMPANIES } from '../../src/forest/wood';
import { WOOD_UPGRADES } from '../../src/forest-data/wood-upgrades';
import { reduce } from '../../src/forest/store';
import { forestSaves } from '../../src/forest/save';
import { simulateWood } from '../../src/forest/bot';
import { pushOn, shiftPush } from '../../src/shared/hunt';

const NOW = 1_000_000;
const wood = () => startWood(createForestGame(1, NOW), 7);
const run = (g: ForestGame, seconds: number) => {
  let next = g;
  for (let t = 0; t < seconds; t++) next = advance(next, 1);
  return next;
};
const lost = (g: ForestGame, i: number) => {
  const c = g.wood!.hunt.prey[i]!.company;
  return c.lifetimeDead + c.turned;
};
const eaves = REGIONS[0]!;
const party = { blade: 4, mender: 1, scout: 1, mystic: 0 };

describe('the wood pushing on a company', () => {
  it('makes every region more dangerous and more corrupting, and does nothing in an ordinary charter', () => {
    const calm = createCompany(1);
    const pushed = { ...calm, woodPush: 2 };
    expect(calm.woodPush).toBe(0);
    expect(project(pushed, eaves, party).danger).toBeGreaterThan(project(calm, eaves, party).danger);
    expect(project(pushed, eaves, party).blightPerHand).toBeGreaterThan(project(calm, eaves, party).blightPerHand);
  });
});

describe('listening to the wood', () => {
  it('turns the ledger over: the wood hungers after several companies under charter at once', () => {
    const g = wood();
    expect(g.mode).toBe('wood');
    expect(g.wood!.hunt.prey).toHaveLength(WOOD_COMPANIES);
  });

  it('lets every company run itself: foraging, hiring and sending parties without the player', () => {
    const g = run(wood(), 900);
    for (const p of g.wood!.hunt.prey) expect(p.company.lifetimeSilver).toBeGreaterThan(0);
  });

  it('takes more hands from a company it pushes than from one it leaves alone', () => {
    let g = wood();
    g = { ...g, wood: { ...g.wood!, hunt: shiftPush(shiftPush(shiftPush(g.wood!.hunt, 0, 1), 0, 1), 0, 1) } };
    const later = run(g, 3_600);
    expect(lost(later, 0)).toBeGreaterThan(lost(later, 1));
    expect(later.wood!.hunt.dread).toBeGreaterThan(0);
  });

  it('makes companies richer, and so better armed, the more the town fears the wood', () => {
    const p = wood().wood!.hunt.prey[0]!;
    expect(WOOD_ADAPTER.step(p, 1, 1, 4).company.charter.renown).toBeGreaterThan(WOOD_ADAPTER.step(p, 1, 1, 0).company.charter.renown);
  });

  it('spends sap on growing: another grove of strength, deeper roots', () => {
    const g = wood();
    const rich = { ...g, wood: { ...g.wood!, hunt: { ...g.wood!.hunt, dread: 1e6 } } };
    const grove = WOOD_UPGRADES.find((u) => u.effect.kind === 'strength')!;
    const bought = buyWoodUpgrade(rich, grove.id);
    expect(bought.wood!.hunt.strength).toBe(g.wood!.hunt.strength + 1);
    expect(bought.wood!.hunt.dread).toBe(1e6 - woodUpgradeCost(rich.wood!, grove.id));
    expect(buyWoodUpgrade(g, grove.id)).toBe(g);
    const roots = WOOD_UPGRADES.find((u) => u.effect.kind === 'push')!;
    expect(woodRules(buyWoodUpgrade(rich, roots.id).wood!).pushPerStep).toBeGreaterThan(woodRules(rich.wood!).pushPerStep);
  });

  it('is beaten back when a charter reaches its reckoning: a new charter comes, and the wood must sleep', () => {
    const g = wood();
    const prey = g.wood!.hunt.prey.map((p, i) => (i === 0 ? { ...p, company: { ...p.company, flags: ['terminus'] } } : p));
    const ended = advance({ ...g, wood: { ...g.wood!, hunt: { ...g.wood!.hunt, prey } } }, 1);
    expect(ended.wood!.hunt.beaten).toBe(1);
    expect(ended.wood!.hunt.prey[0]!.company.charter.number).toBe(2);
    expect(pushOn(ended.wood!.hunt, 0, woodRules(ended.wood!))).toBe(0);
  });

  it('only runs the side of the ledger that is open', () => {
    const g = wood();
    const later = run(g, 60);
    expect(later.company.elapsed).toBe(g.company.elapsed);
    const back = leaveWood(later);
    expect(back.mode).toBe('charter');
    expect(run(back, 30).wood!.hunt.prey[0]!.company.elapsed).toBe(later.wood!.hunt.prey[0]!.company.elapsed);
  });

  it('takes orders: listen, push, sleep, grow, and return to the ledger', () => {
    let g = reduce(createForestGame(1, NOW), { type: 'startWood', seed: 3 });
    expect(g.mode).toBe('wood');
    g = reduce(g, { type: 'shiftWoodPush', index: 1, step: 1 });
    expect(g.wood!.hunt.split[1]).toBe(1);
    g = reduce(g, { type: 'toggleWoodDormant' });
    expect(g.wood!.hunt.dormant).toBe(true);
    g = reduce(g, { type: 'leaveWood' });
    expect(g.mode).toBe('charter');
  });

  it('survives a save and reload, and old saves open on the ledger', () => {
    const g = run(wood(), 30);
    const back = forestSaves.deserialize(forestSaves.serialize(g));
    expect(back.wood!.hunt.prey[0]!.company.elapsed).toBe(g.wood!.hunt.prey[0]!.company.elapsed);
    const old = createForestGame(1, NOW);
    const { woodPush: _ignored, ...company } = old.company;
    const loaded = forestSaves.deserialize(JSON.stringify({ ...old, version: 6, mode: undefined, wood: undefined, company }));
    expect(loaded.mode).toBe('charter');
    expect(loaded.wood).toBeNull();
    expect(loaded.company.woodPush).toBe(0);
  });
});

describe('the wood, played through', () => {
  it('lets a hungry wood out-harvest one that never pushes, and grow doing it', { timeout: 60_000 }, () => {
    const played = simulateWood({ seed: 7, maxSeconds: 2 * 3600 });
    const idle = simulateWood({ seed: 7, maxSeconds: 2 * 3600, passive: true });
    expect(played.harvest).toBeGreaterThan(idle.harvest * 1.5);
    expect(played.upgrades).toBeGreaterThan(1);
  });
});
