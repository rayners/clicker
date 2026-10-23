import { describe, it, expect } from 'vitest';
import { applyDecisions, defend, huntDecider, playHunt, playthrough } from '../../src/engine/bot';
import { createHunt, type HuntState } from '../../src/engine/hunt';

interface Toy {
  coins: number;
  shops: number;
  act: number;
  time: number;
  done: boolean;
}
type ToyAction = { type: 'press' } | { type: 'buy' } | { type: 'tick'; dt: number };
const reduce = (g: Toy, a: ToyAction): Toy => {
  if (a.type === 'press') return { ...g, coins: g.coins + 1 };
  if (a.type === 'buy') return g.coins >= 10 ? { ...g, coins: g.coins - 10, shops: g.shops + 1 } : g;
  const coins = g.coins + g.shops * a.dt;
  const time = g.time + a.dt;
  return { ...g, coins, time, act: time >= 600 ? 3 : time >= 120 ? 2 : 1, done: time >= 900 };
};
const fresh = (): Toy => ({ coins: 0, shops: 0, act: 1, time: 0, done: false });

describe('applying decisions', () => {
  it('keeps acting until there is nothing worth doing, or an action changes nothing', () => {
    const g = applyDecisions({ ...fresh(), coins: 35 }, (s) => (s.coins >= 10 ? { type: 'buy' as const } : null), reduce);
    expect(g.shops).toBe(3);
    expect(applyDecisions({ ...fresh(), coins: 35 }, () => ({ type: 'buy' as const }), (s: Toy) => s, 5).shops).toBe(0);
  });
});

describe('a playthrough', () => {
  it('taps for the first stretch, then checks in now and then, and records when each act and the end come', () => {
    const run = playthrough<Toy, ToyAction>({
      start: fresh(),
      reduce,
      press: { type: 'press' },
      decide: (s) => (s.coins >= 10 ? { type: 'buy' as const } : null),
      tick: (s, dt) => reduce(s, { type: 'tick', dt }),
      act: (s) => s.act,
      done: (s) => s.done,
      maxSeconds: 2000,
      activeSeconds: 60,
      activeTaps: 4,
    });
    expect(run.actAt).toEqual({ 1: 0, 2: 120, 3: 600 });
    expect(run.doneAt).toBe(900);
    expect(run.final.shops).toBeGreaterThan(0);
  });

  it('notes the first time each milestone of the game\'s choosing is reached', () => {
    const run = playthrough<Toy, ToyAction>({
      start: fresh(),
      reduce,
      press: { type: 'press' },
      decide: () => null,
      tick: (s, dt) => reduce(s, { type: 'tick', dt }),
      act: (s) => s.act,
      done: () => false,
      maxSeconds: 100,
      milestones: { rich: (s) => s.coins >= 40 },
    });
    expect(run.firstAt.rich).toBe(10);
    expect(run.doneAt).toBeUndefined();
  });
});

describe('a playthrough, watched', () => {
  it('lets the game watch every second, and caps how much it does per check-in', () => {
    const seen: number[] = [];
    const run = playthrough<Toy, ToyAction>({
      start: { ...fresh(), coins: 1000 },
      reduce,
      press: { type: 'press' },
      decide: () => ({ type: 'buy' as const }),
      tick: (s, dt) => reduce(s, { type: 'tick', dt }),
      act: (s) => s.act,
      done: () => false,
      maxSeconds: 5,
      activeTaps: 0,
      maxDecisions: 3,
      onStep: (_s, t) => seen.push(t),
    });
    expect(seen).toEqual([1, 2, 3, 4, 5]);
    expect(run.final.shops).toBe(3);
  });
});

describe('playing a hunt', () => {
  it('checks in every few seconds and lets time pass, or only lets time pass for a horror that does nothing', () => {
    const tick = (s: Toy, dt: number) => reduce(s, { type: 'tick', dt });
    const active = playHunt<Toy, ToyAction>({ start: { ...fresh(), coins: 25 }, reduce, decide: (s) => (s.coins >= 10 ? { type: 'buy' as const } : null), tick, seconds: 10 });
    expect(active.shops).toBeGreaterThan(0);
    const passive = playHunt<Toy, ToyAction>({ start: { ...fresh(), coins: 25 }, reduce, decide: null, tick, seconds: 10 });
    expect(passive.shops).toBe(0);
    expect(passive.time).toBe(10);
  });
});

describe('the horror bot', () => {
  interface Prey {
    alarm: number;
  }
  const hunt = (patch: Partial<HuntState<Prey>> = {}): HuntState<Prey> => ({ ...createHunt([{ alarm: 0.5 }, { alarm: 0.1 }, { alarm: 0.3 }], { strength: 2, hunger: 50 }), ...patch });
  const decide = huntDecider<HuntState<Prey>, Prey, string>({
    hunt: (h) => h,
    upgrade: (h) => (h.dread >= 10 ? 'claws' : null),
    alarm: (p) => p.alarm,
    buy: (id) => `buy ${id}`,
    toggle: () => 'toggle',
    push: (i) => `push ${i}`,
  });

  it('buys what it can afford first', () => {
    expect(decide(hunt({ dread: 20 }))).toBe('buy claws');
  });

  it('lies low when too notorious, and wakes once forgotten', () => {
    expect(decide(hunt({ notoriety: 5 }))).toBe('toggle');
    expect(decide(hunt({ dormant: true, notoriety: 0.5 }))).toBe('toggle');
  });

  it('pushes on the prey that has worked out the least, until its strength is spent', () => {
    expect(decide(hunt())).toBe('push 1');
    expect(decide(hunt({ split: [1, 1, 0] }))).toBeNull();
  });

  it('can back off a prey before it works things out, and go back only once it has mostly forgotten', () => {
    const careful = huntDecider<HuntState<Prey>, Prey, string>({
      hunt: (h) => h,
      upgrade: () => null,
      alarm: (p) => p.alarm,
      buy: (id) => `buy ${id}`,
      toggle: () => 'toggle',
      push: (i) => `push ${i}`,
      pull: (i) => `pull ${i}`,
      wary: { easeOffAt: 0.8, returnAt: 0.4 },
    });
    const h = createHunt([{ alarm: 0.9 }, { alarm: 0.5 }, { alarm: 0.2 }], { strength: 2, hunger: 50 });
    expect(careful({ ...h, split: [1, 0, 0] })).toBe('pull 0');
    expect(careful({ ...h, split: [0, 0, 1] })).toBe('push 2');
    expect(careful({ ...h, split: [0, 0, 2] })).toBeNull();
    expect(careful(createHunt([{ alarm: 0.5 }, { alarm: 0.6 }], { strength: 1, hunger: 50 }))).toBeNull();
  });
});

describe('a defender', () => {
  it('taps hard early and lightly later, and clears what it can every few seconds, for a prey run by its own bot', () => {
    type G = { coins: number; elapsed: number; shops: number };
    const reduceG = (g: G, a: 'press' | 'buy'): G => (a === 'press' ? { ...g, coins: g.coins + 1 } : g.coins >= 10 ? { ...g, coins: g.coins - 10, shops: g.shops + 1 } : g);
    const start = { taps: 0, decideIn: 5 };
    const early = defend(start, { coins: 0, elapsed: 0, shops: 0 }, 1, { elapsed: (g) => g.elapsed, press: 'press', reduce: reduceG, decide: (g) => (g.coins >= 10 ? 'buy' : null) });
    expect(early.game.coins).toBe(4);
    const late = defend(start, { coins: 0, elapsed: 3600, shops: 0 }, 1, { elapsed: (g) => g.elapsed, press: 'press', reduce: reduceG, decide: () => null });
    expect(late.game.coins).toBe(0);
    expect(late.taps).toBeCloseTo(0.1);
    const due = defend({ taps: 0, decideIn: 1 }, { coins: 25, elapsed: 3600, shops: 0 }, 1, { elapsed: (g) => g.elapsed, press: 'press', reduce: reduceG, decide: (g) => (g.coins >= 10 ? 'buy' : null) });
    expect(due.game.shops).toBe(2);
    expect(due.decideIn).toBe(5);
  });
});
