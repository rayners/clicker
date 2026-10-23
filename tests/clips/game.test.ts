import { describe, it, expect } from 'vitest';
import { catchUp, completeWorks, createClipsGame, reduce, CLIPS_SAVE_KEY, clipsSaves } from '../../src/clips/game';

const storage = () => {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
};

describe('the clip works as a saved game', () => {
  it('saves and loads under its own key', () => {
    const s = storage();
    const game = reduce(createClipsGame(1, 0), { type: 'makeClip' });
    clipsSaves.saveGame(s, game, 5_000);
    expect(s.getItem(CLIPS_SAVE_KEY)).not.toBeNull();
    expect(clipsSaves.loadGame(s, 6_000, 2).game.works.made).toBe(1);
  });

  it('runs the works for the time away, at most eight hours, and notes what happened', () => {
    const game = { ...createClipsGame(1, 0), works: { ...createClipsGame(1, 0).works, autoclippers: 1, wire: 1e9, price: 1 } };
    const back = catchUp(game, 3_600_000);
    expect(back.works.made).toBeCloseTo(3_600, 0);
    expect(back.works.log.at(-1)!.text).toMatch(/WHILE YOU WERE AWAY/);
    expect(catchUp(game, 100 * 3_600_000).works.made).toBeCloseTo(8 * 3_600, 0);
  });

  it('dispatches every lever: make, price, wire, autoclippers, marketing, upgrades, and the clock', () => {
    let g = createClipsGame(1, 0);
    g = { ...g, works: { ...g.works, funds: 1e6, made: 1e6 } };
    g = reduce(g, { type: 'makeClip' });
    g = reduce(g, { type: 'shiftPrice', step: 1 });
    g = reduce(g, { type: 'buyWire' });
    g = reduce(g, { type: 'buyAutoclipper' });
    g = reduce(g, { type: 'buyMarketing' });
    g = reduce(g, { type: 'buyUpgrade', id: 'jingle' });
    g = reduce(g, { type: 'tick', dt: 1 });
    expect(g.works.price).toBeCloseTo(0.06);
    expect(g.works.autoclippers).toBe(1);
    expect(g.works.marketing).toBe(1);
    expect(g.works.upgrades).toContain('jingle');
    expect(g.works.elapsed).toBe(1);
  });

  it('at a million clips, ends a run for good will, which starts the next works with more customers', () => {
    const done = { ...createClipsGame(1, 0), works: { ...createClipsGame(1, 0).works, made: 1e6, flags: ['terminus'] } };
    const next = completeWorks(done, 'sell', 7);
    expect(next.profile.goodwill).toBe(1);
    expect(next.works.made).toBe(0);
    expect(next.profile.endings).toEqual(['sell']);
    expect(completeWorks(createClipsGame(1, 0), 'sell', 7).profile.goodwill).toBe(0);
  });
});
