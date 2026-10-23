import { describe, it, expect } from 'vitest';
import {
  createHunt,
  legendEarned,
  pushOn,
  shiftPush,
  tickHunt,
  toggleDormant,
  type HuntRules,
  type PreyAdapter,
} from '../../src/engine/hunt';

/** A stub prey: people die in proportion to the push, defenders get better with notoriety, it ends at a fixed time. */
interface Stub {
  alive: number;
  dead: number;
  elapsed: number;
  guard: number;
}

const stub = (): Stub => ({ alive: 1_000, dead: 0, elapsed: 0, guard: 0 });
const adapter: PreyAdapter<Stub> = {
  step: (p, dt, push, notoriety) => {
    const guard = notoriety;
    const deaths = Math.min(p.alive, push * dt * 0.1 / (1 + guard));
    return { alive: p.alive - deaths, dead: p.dead + deaths, elapsed: p.elapsed + dt, guard };
  },
  harvest: (before, after) => after.dead - before.dead,
  alarm: (p) => Math.min(1, p.elapsed / 1_000),
  finished: (p) => p.elapsed >= 2_000,
  spawn: () => stub(),
};
const RULES: HuntRules = {
  pushPerStep: 1,
  hungerPerStep: 0.05,
  feed: 1,
  maxHunger: 100,
  notorietyPerHarvest: 0.01,
  notorietyDecay: 0.002,
  dormantDecay: 0.02,
  beatenFor: 120,
};
const hunt = (prey = 3) => createHunt(Array.from({ length: prey }, stub), { strength: 4, hunger: 50 });
const run = (h: ReturnType<typeof hunt>, seconds: number, rules = RULES) => {
  let next = h;
  for (let t = 0; t < seconds; t++) next = tickHunt(next, adapter, 1, rules);
  return next;
};

describe('the hunt', () => {
  it('starts with every prey untouched, nothing pushed, and the horror hungry', () => {
    const h = hunt();
    expect(h.prey).toHaveLength(3);
    expect(h.split).toEqual([0, 0, 0]);
    expect(h.harvest).toBe(0);
    expect(h.hunger).toBe(50);
  });

  it('splits the horror\'s strength across prey one step at a time, never beyond its strength', () => {
    let h = hunt();
    h = shiftPush(h, 0, 1);
    h = shiftPush(h, 0, 1);
    h = shiftPush(h, 2, 1);
    expect(h.split).toEqual([2, 0, 1]);
    h = shiftPush(shiftPush(h, 1, 1), 1, 1);
    expect(h.split.reduce((a, b) => a + b, 0)).toBe(4);
    expect(shiftPush(hunt(), 0, -1).split[0]).toBe(0);
  });

  it('harvests from the prey it pushes, and only from them', () => {
    const later = run(shiftPush(shiftPush(hunt(), 0, 1), 0, 1), 60);
    expect(later.harvest).toBeGreaterThan(0);
    expect(later.prey[0]!.dead).toBeGreaterThan(0);
    expect(later.prey[1]!.dead).toBe(0);
  });

  it('spends hunger to push and is fed by the harvest; starving, it cannot push at all', () => {
    const pushing = shiftPush(hunt(), 0, 1);
    expect(pushOn(pushing, 0, RULES)).toBeGreaterThan(0);
    const starved = { ...pushing, hunger: 0 };
    expect(pushOn(starved, 0, RULES)).toBe(0);
    const fed = run(shiftPush(hunt(), 0, 1), 30, { ...RULES, hungerPerStep: 0 });
    expect(fed.hunger).toBeGreaterThan(50);
  });

  it('grows notorious with every harvest, which makes every prey harder to take', () => {
    const later = run(shiftPush(shiftPush(hunt(), 0, 1), 1, 1), 200);
    expect(later.notoriety).toBeGreaterThan(0);
    expect(later.prey[2]!.guard).toBeCloseTo(later.notoriety, 5);
  });

  it('lets the horror go dormant: no push, and notoriety fades faster', () => {
    const noted = { ...shiftPush(hunt(), 0, 1), notoriety: 2 };
    const asleep = toggleDormant(noted);
    expect(asleep.dormant).toBe(true);
    expect(pushOn(asleep, 0, RULES)).toBe(0);
    expect(run(asleep, 60).notoriety).toBeLessThan(run(noted, 60).notoriety);
  });

  it('is beaten back when a prey reaches its end: that prey is replaced, and the horror must lie low for a while', () => {
    const near = { ...shiftPush(hunt(), 0, 1), prey: [{ ...stub(), elapsed: 1_999 }, stub(), stub()] };
    const after = run(near, 2);
    expect(after.prey[0]!.elapsed).toBeLessThan(10);
    expect(after.beaten).toBe(1);
    expect(after.beatenFor).toBeGreaterThan(0);
    expect(pushOn(after, 1, RULES)).toBe(0);
    expect(run(after, RULES.beatenFor + 5).beatenFor).toBe(0);
  });

  it('reports each prey\'s alarm', () => {
    const h = run(hunt(), 500);
    expect(adapter.alarm(h.prey[0]!)).toBeGreaterThan(0);
  });
});

describe('starving', () => {
  it('recovers hunger while the horror rests, so a starved hunt can always start again', () => {
    let h = { ...createHunt([stub(), stub(), stub()], { strength: 3, hunger: 0 }), split: [3, 0, 0] };
    for (let t = 0; t < 600; t++) h = tickHunt(h, adapter, 1, RULES);
    expect(h.hunger).toBe(0);
    h = toggleDormant(h);
    for (let t = 0; t < 600; t++) h = tickHunt(h, adapter, 1, RULES);
    expect(h.hunger).toBeGreaterThan(0);
  });
});

describe('Legend: what a finished hunt leaves behind', () => {
  it('grows with the square root of the harvest, so the first hunts count most', () => {
    expect(legendEarned(0)).toBe(0);
    expect(legendEarned(100)).toBe(2);
    expect(legendEarned(300)).toBe(3);
    expect(legendEarned(900)).toBe(6);
  });

  it('starts the next hunt stronger: a step of strength per two Legend, and harvest in hand to grow with', () => {
    const plain = createHunt([1, 2], { strength: 3, hunger: 60 });
    const storied = createHunt([1, 2], { strength: 3, hunger: 60, legend: 5 });
    expect(storied.strength).toBe(plain.strength + 2);
    expect(storied.dread).toBe(50);
    expect(plain.dread).toBe(0);
  });
});
