import { describe, it, expect } from 'vitest';
import { createClock, OFFLINE_CAP_SECONDS } from '../../src/engine/clock';

interface Toy {
  savedAt: number;
  time: number;
  ticks: number[];
  waiting?: boolean;
  notes?: string[];
}

const toy = (patch: Partial<Toy> = {}): Toy => ({ savedAt: 0, time: 0, ticks: [], ...patch });
const tick = (g: Toy, dt: number): Toy => ({ ...g, time: g.time + dt, ticks: [...g.ticks, dt] });

describe('the game clock', () => {
  it('runs a live frame as it comes', () => {
    const clock = createClock<Toy>({ tick, step: 1 });
    expect(clock.advance(toy(), 0.1).ticks).toEqual([0.1]);
  });

  it('runs time away in steps, capped at eight hours', () => {
    const clock = createClock<Toy>({ tick, step: 600 });
    const g = clock.advance(toy(), 1_800);
    expect(g.ticks).toEqual([600, 600, 600]);
    expect(clock.advance(toy(), 100 * 3600).time).toBe(OFFLINE_CAP_SECONDS);
  });

  it('lets the step depend on the game, e.g. coarser while several runs go at once', () => {
    const clock = createClock<Toy>({ tick, step: (g) => (g.waiting ? 900 : 300) });
    expect(clock.advance(toy({ waiting: true }), 1_800).ticks).toEqual([900, 900]);
  });

  it('does not run time backwards when the device clock is set back', () => {
    const clock = createClock<Toy>({ tick, step: 1 });
    expect(clock.advance(toy(), -30)).toEqual(toy());
    expect(clock.advance(toy(), Number.NaN)).toEqual(toy());
  });

  it('catches up the time since the last save on load, and stamps the game as saved now', () => {
    const clock = createClock<Toy>({ tick, step: 60 });
    const g = clock.catchUp(toy({ savedAt: 1_000 }), 1_000 + 120_000);
    expect(g.time).toBe(120);
    expect(g.savedAt).toBe(121_000);
    expect(clock.catchUp(toy({ savedAt: 5_000 }), 1_000)).toEqual(toy({ savedAt: 5_000 }));
  });

  it('lets the game note what happened while the player was away', () => {
    const clock = createClock<Toy>({ tick, step: 60, noteAway: (before, after, seconds) => ({ ...after, notes: [`${seconds}s, +${after.time - before.time}`] }) });
    expect(clock.advance(toy(), 300).notes).toEqual(['300s, +300']);
    expect(clock.advance(toy(), 1).notes).toBeUndefined();
  });

  it('holds still while the game is paused, e.g. waiting for the player to choose', () => {
    const clock = createClock<Toy>({ tick, step: 60, paused: (g) => !!g.waiting });
    expect(clock.advance(toy({ waiting: true }), 300)).toEqual(toy({ waiting: true }));
    expect(clock.advance(toy({ waiting: true }), 0.1)).toEqual(toy({ waiting: true }));
  });
});
