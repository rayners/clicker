import { describe, it, expect } from 'vitest';
import { compileGame, DefinitionError, type DataRun } from '../../src/engine/data/game';
import type { GameDefinition } from '../../src/engine/data/definition';

const DEF: GameDefinition = {
  id: 'tiny-works',
  version: 1,
  title: 'TINY WORKS',
  carried: { goodwill: { label: 'GOOD WILL', effects: [{ target: 'market.demand', plus: 0.25 }] } },
  resources: {
    wire: { label: 'WIRE', unit: 'IN', start: 1000 },
    clips: { label: 'CLIPS' },
    funds: { label: 'FUNDS', format: 'money' },
    made: { label: 'MADE', lifetime: 'clips' },
  },
  press: { label: 'MAKE A CLIP', converts: { wire: -1, clips: 1 } },
  items: [
    { id: 'autoclipper', label: 'AUTOCLIPPER', text: 'Bends a clip a second.', cost: { resource: 'funds', base: 5, growth: 1.1 }, converts: { wire: -1, clips: 1 }, rate: 1 },
    { id: 'marketing', label: 'MARKETING', text: 'More people want clips.', cost: { resource: 'funds', base: 100, growth: 2 }, effects: [{ target: 'market.demand', times: 1.6 }] },
  ],
  upgrades: [
    { id: 'dies', label: 'Sharper dies', text: 'Faster.', cost: { resource: 'funds', amount: 50 }, shown: 'made >= 200', effects: [{ target: 'autoclipper.rate', times: 1.5 }] },
    { id: 'order', label: 'Standing order', text: 'Buys wire.', cost: { resource: 'funds', amount: 200 }, shown: 'made >= 1000', automate: 'supply' },
  ],
  mechanics: {
    market: { sells: 'clips', for: 'funds', price: { start: 0.05, step: 0.01, min: 0.01 }, demand: { base: 20, elasticity: 2 } },
    supply: { buys: 'wire', with: 'funds', lot: 1000, price: { start: 20, drift: 2, every: 10, min: 12, max: 32 }, neverStuck: true },
  },
  story: {
    gap: 30,
    opening: 'One bench, one spool of wire.',
    beats: [
      { id: 'trade', act: 2, when: 'made >= 2000', kind: 'letter', text: 'The stationers want your clips.' },
      { id: 'million', when: 'made >= 1000000', text: 'One million clips.', ends: true, urgent: true },
    ],
  },
  endings: [{ id: 'sell', title: 'SELL THE WORKS', text: 'Start again across town.', grants: { goodwill: 1 } }],
  guide: [{ id: 'make', title: 'MAKE A CLIP', text: 'Tap the big button.', target: 'press', done: 'made >= 10' }],
};

const game = compileGame(DEF);
const fresh = () => game.create(1);

describe('a game made of data', () => {
  it('starts with each resource at its starting amount, act one, and the opening line in the log', () => {
    const run = fresh();
    expect(run.amounts).toEqual({ wire: 1000, clips: 0, funds: 0, made: 0 });
    expect(run.act).toBe(1);
    expect(run.log.map((e) => e.text)).toEqual(['One bench, one spool of wire.']);
  });

  it('converts on a press, and counts lifetime resources', () => {
    const run = game.reduce(fresh(), { type: 'press' });
    expect(run.amounts).toMatchObject({ wire: 999, clips: 1, made: 1 });
    expect(game.reduce({ ...fresh(), amounts: { ...fresh().amounts, wire: 0 } }, { type: 'press' }).amounts.clips).toBe(0);
  });

  it('buys items at a price that grows with each one owned', () => {
    let run: DataRun = { ...fresh(), amounts: { ...fresh().amounts, funds: 100 } };
    run = game.reduce(run, { type: 'buy', id: 'autoclipper' });
    expect(run.owned.autoclipper).toBe(1);
    expect(run.amounts.funds).toBe(95);
    expect(game.price(run, 'autoclipper')).toBeCloseTo(5.5);
  });

  it('runs its producers each second, as far as their inputs go', () => {
    const run = game.tick({ ...fresh(), owned: { autoclipper: 3 }, amounts: { ...fresh().amounts, wire: 2 }, price: 10 }, 1);
    expect(run.amounts.made).toBe(2);
  });

  it('sells to demand that answers price, and steps the price a cent at a time', () => {
    const cheap = game.tick({ ...fresh(), amounts: { ...fresh().amounts, clips: 1000 }, price: 0.03 }, 1);
    const dear = game.tick({ ...fresh(), amounts: { ...fresh().amounts, clips: 1000 }, price: 0.1 }, 1);
    expect(1000 - cheap.amounts.clips!).toBeGreaterThan(1000 - dear.amounts.clips!);
    expect(game.reduce(fresh(), { type: 'price', step: 1 }).price).toBeCloseTo(0.06);
    expect(game.reduce({ ...fresh(), price: 0.01 }, { type: 'price', step: -1 }).price).toBeCloseTo(0.01);
  });

  it('applies upgrades and items as multipliers on the stats they name', () => {
    const run = { ...fresh(), upgrades: ['dies'], owned: { marketing: 2 } };
    expect(game.stat(run, 'autoclipper.rate')).toBeCloseTo(1.5);
    expect(game.stat(run, 'market.demand')).toBeCloseTo(1.6 * 1.6);
  });

  it('shows an upgrade only once its condition holds, and buys it once', () => {
    expect(game.availableUpgrades(fresh())).toEqual([]);
    const run = { ...fresh(), amounts: { ...fresh().amounts, made: 300, funds: 100 } };
    expect(game.availableUpgrades(run).map((u) => u.id)).toEqual(['dies']);
    const bought = game.reduce(run, { type: 'upgrade', id: 'dies' });
    expect(bought.upgrades).toEqual(['dies']);
    expect(game.reduce(bought, { type: 'upgrade', id: 'dies' })).toBe(bought);
  });

  it('buys supply in lots at a drifting price, never leaves the player stuck, and automates once the upgrade is in', () => {
    const run = game.reduce({ ...fresh(), amounts: { ...fresh().amounts, wire: 0, funds: 100 } }, { type: 'supply' });
    expect(run.amounts.wire).toBe(1000);
    expect(run.amounts.funds).toBe(80);
    const stuck = game.reduce({ ...fresh(), amounts: { ...fresh().amounts, wire: 0, funds: 10 } }, { type: 'supply' });
    expect(stuck.amounts.wire).toBe(500);
    expect(game.tick(fresh(), 120).supplyPrice).not.toBe(20);
    const auto = game.tick({ ...fresh(), upgrades: ['order'], owned: { autoclipper: 5000 }, amounts: { ...fresh().amounts, wire: 0, funds: 1e6 } }, 1);
    expect(auto.amounts.wire).toBeGreaterThanOrEqual(5000);
  });

  it('tells its story as it goes, and offers its endings at the end, which carry good will into the next run', () => {
    let run: DataRun = { ...fresh(), amounts: { ...fresh().amounts, made: 2000 } };
    for (let i = 0; i < 40; i++) run = game.tick(run, 1);
    expect(run.act).toBe(2);
    run = game.tick({ ...run, amounts: { ...run.amounts, made: 1e6 } }, 1);
    expect(run.flags).toContain('terminus');
    const next = game.complete(run, 'sell', 7);
    expect(next.carried.goodwill).toBe(1);
    expect(next.amounts.made).toBe(0);
    expect(game.stat(next, 'market.demand')).toBeCloseTo(1.25);
  });

  it('reads expressions against the game: resources, items owned, stats, upgrades bought', () => {
    const run = { ...fresh(), owned: { autoclipper: 2 }, upgrades: ['dies'], amounts: { ...fresh().amounts, made: 50 } };
    expect(game.evaluate(run, "made >= 10 and autoclipper == 2 and has('dies') and autoclipper.rate > 1")).toBe(true);
  });

  it('refuses a definition with an unknown name in a condition, saying where', () => {
    const broken = { ...DEF, upgrades: [{ ...DEF.upgrades![0]!, shown: 'mde >= 200' }] };
    expect(() => compileGame(broken)).toThrow(DefinitionError);
    expect(() => compileGame(broken)).toThrow(/upgrades\[0\]\.shown: unknown name "mde"/);
  });
});
