import { seasoned } from '../helpers';
import { describe, it, expect } from 'vitest';
import { advance, createForestGame, type ForestGame } from '../../src/forest/game';
import { buyDragonUpgrade, DRAGON_ADAPTER, DRAGON_COMPANIES, dragonRules, dragonUpgradeCost, leaveDragon, raid, wakeDragon } from '../../src/forest/dragon';
import { DRAGON_UPGRADES } from '../../src/forest-data/dragon-upgrades';
import { reduce } from '../../src/forest/store';
import { forestSaves } from '../../src/forest/save';
import { simulateDragon } from '../../src/forest/bot';
import { pushOn, shiftPush } from '../../src/shared/hunt';

const NOW = 1_000_000;
const dragon = () => wakeDragon(createForestGame(1, NOW), 7);
const run = (g: ForestGame, seconds: number) => {
  let next = g;
  for (let t = 0; t < seconds; t++) next = advance(next, 1);
  return next;
};

describe('a dragon raid', () => {
  it('takes a share of a company\'s vault and burns an idle hand, and the hoard grows with the haul', () => {
    const p = dragon().dragon!.hunt.prey[0]!;
    const rich = { ...p, company: { ...p.company, relics: 1_000, hired: { ...p.company.hired, blade: 5 } } };
    const after = raid(rich);
    expect(after.company.relics).toBeLessThan(1_000);
    expect(after.company.hired.blade + after.company.hired.mender + after.company.hired.scout).toBeLessThan(5 + rich.company.hired.mender + rich.company.hired.scout);
    expect(after.hoard).toBeGreaterThan(raid({ ...rich, company: { ...rich.company, relics: 10 } }).hoard);
    expect(after.company.log.at(-1)!.text).toMatch(/DRAGON|WINGS|FIRE/);
  });
});

describe('waking the dragon', () => {
  it('turns the ledger to the hoard: the dragon watches several companies at once', () => {
    const g = dragon();
    expect(g.mode).toBe('dragon');
    expect(g.dragon!.hunt.prey).toHaveLength(DRAGON_COMPANIES);
  });

  it('lets every company run itself', () => {
    const g = run(dragon(), 900);
    for (const p of g.dragon!.hunt.prey) expect(p.company.lifetimeSilver).toBeGreaterThan(0);
  });

  it('raids a company it pushes on and leaves the others alone, and the hoard is its harvest', () => {
    let g = dragon();
    g = { ...g, dragon: { ...g.dragon!, hunt: shiftPush(shiftPush(g.dragon!.hunt, 0, 1), 0, 1) } };
    const later = run(g, 1_800);
    expect(later.dragon!.hunt.prey[0]!.raids).toBeGreaterThan(0);
    expect(later.dragon!.hunt.prey[1]!.raids).toBe(0);
    expect(later.dragon!.hunt.dread).toBeGreaterThan(0);
  });

  it('brings slayers: companies grow richer, and so better armed, the more notorious it is', () => {
    const p = dragon().dragon!.hunt.prey[0]!;
    expect(DRAGON_ADAPTER.step(p, 1, 1, 4).company.charter.renown).toBeGreaterThan(DRAGON_ADAPTER.step(p, 1, 1, 0).company.charter.renown);
  });

  it('spends the hoard on growing: another wing, hotter fire', () => {
    const g = dragon();
    const rich = { ...g, dragon: { ...g.dragon!, hunt: { ...g.dragon!.hunt, dread: 1e6 } } };
    const wing = DRAGON_UPGRADES.find((u) => u.effect.kind === 'strength')!;
    const bought = buyDragonUpgrade(rich, wing.id);
    expect(bought.dragon!.hunt.strength).toBe(g.dragon!.hunt.strength + 1);
    expect(bought.dragon!.hunt.dread).toBe(1e6 - dragonUpgradeCost(rich.dragon!, wing.id));
    expect(buyDragonUpgrade(g, wing.id)).toBe(g);
    const fire = DRAGON_UPGRADES.find((u) => u.effect.kind === 'push')!;
    expect(dragonRules(buyDragonUpgrade(rich, fire.id).dragon!).pushPerStep).toBeGreaterThan(dragonRules(rich.dragon!).pushPerStep);
  });

  it('is driven to its lair when a charter reaches its reckoning: a new charter comes, and the dragon must sleep', () => {
    const g = dragon();
    const prey = g.dragon!.hunt.prey.map((p, i) => (i === 0 ? { ...p, company: { ...p.company, flags: ['terminus'] } } : p));
    const ended = advance({ ...g, dragon: { ...g.dragon!, hunt: { ...g.dragon!.hunt, prey } } }, 1);
    expect(ended.dragon!.hunt.beaten).toBe(1);
    expect(ended.dragon!.hunt.prey[0]!.company.charter.number).toBe(2);
    expect(pushOn(ended.dragon!.hunt, 0, dragonRules(ended.dragon!))).toBe(0);
  });

  it('only runs the side of the ledger that is open', () => {
    const g = dragon();
    const later = run(g, 60);
    expect(later.company.elapsed).toBe(g.company.elapsed);
    const back = leaveDragon(later);
    expect(back.mode).toBe('charter');
    expect(run(back, 30).dragon!.hunt.prey[0]!.company.elapsed).toBe(later.dragon!.hunt.prey[0]!.company.elapsed);
  });

  it('takes orders: wake, raid, sleep on the hoard, grow, and return to the ledger', () => {
    let g = reduce(seasoned(createForestGame(1, NOW)), { type: 'wakeDragon', seed: 3 });
    expect(g.mode).toBe('dragon');
    g = reduce(g, { type: 'shiftDragonPush', index: 1, step: 1 });
    expect(g.dragon!.hunt.split[1]).toBe(1);
    g = reduce(g, { type: 'toggleDragonDormant' });
    expect(g.dragon!.hunt.dormant).toBe(true);
    g = reduce({ ...g, dragon: { ...g.dragon!, hunt: { ...g.dragon!.hunt, dread: 1e6 } } }, { type: 'buyDragonUpgrade', id: DRAGON_UPGRADES[0]!.id });
    expect(g.dragon!.bought[DRAGON_UPGRADES[0]!.id]).toBe(1);
    g = reduce(g, { type: 'leaveDragon' });
    expect(g.mode).toBe('charter');
  });

  it('survives a save and reload, and older saves have no dragon awake', () => {
    const g = run(dragon(), 30);
    const back = forestSaves.deserialize(forestSaves.serialize(g));
    expect(back.dragon!.hunt.prey[0]!.company.elapsed).toBe(g.dragon!.hunt.prey[0]!.company.elapsed);
    const old = createForestGame(1, NOW);
    const { dragon: _d, ...rest } = old;
    expect(forestSaves.deserialize(JSON.stringify({ ...rest, version: 9 })).dragon).toBeNull();
  });
});

describe('the dragon, played through', () => {
  it('lets a raiding dragon out-harvest one that sleeps, and grow doing it', { timeout: 60_000 }, () => {
    const played = simulateDragon({ seed: 7, maxSeconds: 2 * 3600 });
    const idle = simulateDragon({ seed: 7, maxSeconds: 2 * 3600, passive: true });
    expect(played.harvest).toBeGreaterThan(idle.harvest * 1.5 + 1);
    expect(played.upgrades).toBeGreaterThan(1);
  });
});
