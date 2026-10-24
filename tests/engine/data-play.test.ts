import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileGame } from '../../src/engine/data/game';
import { createDataPlay } from '../../src/engine/data/play';

const game = compileGame(JSON.parse(readFileSync(resolve(__dirname, '../../games/clip-works.json'), 'utf8')));
const play = createDataPlay(game);

const storage = () => {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
};

describe('playing a game made of data', () => {
  it('saves under a key of its own id, and loads back', () => {
    const s = storage();
    const state = play.reduce(play.fresh(1, 0), { type: 'press' });
    play.saves.saveGame(s, state, 1_000);
    expect(play.saveKey).toBe('data.clip-works.save');
    expect(play.saves.loadGame(s, 2_000, 2).game.run.amounts.made).toBe(1);
  });

  it('runs the game for the time away, capped, and notes what came of it', () => {
    const state = { ...play.fresh(1, 0), run: { ...play.fresh(1, 0).run, owned: { autoclipper: 1 }, price: 10 } };
    const back = play.catchUp(state, 3_600_000);
    expect(back.run.amounts.made).toBeGreaterThan(900);
    expect(back.run.log.at(-1)!.text).toMatch(/WHILE YOU WERE AWAY \(1h 0m\)/);
  });

  it('passes the game\'s actions through, and the clock', () => {
    let state = play.fresh(1, 0);
    state = play.reduce(state, { type: 'press' });
    state = play.reduce(state, { type: 'price', step: 1 });
    state = play.reduce(state, { type: 'tick', dt: 1 });
    expect(state.run.amounts.made).toBe(1);
    expect(state.run.price).toBeCloseTo(0.06);
    expect(state.run.elapsed).toBe(1);
  });

  it('keeps settings across a reset, and ends a run for its ending', () => {
    let state = play.reduce(play.fresh(1, 0), { type: 'setSetting', key: 'reducedMotion', value: true });
    state = play.reduce({ ...state, run: { ...state.run, amounts: { ...state.run.amounts, made: 500 } } }, { type: 'reset', seed: 2, now: 5 });
    expect(state.run.amounts.made).toBe(0);
    expect(state.settings.reducedMotion).toBe(true);
    const done = { ...state, run: { ...state.run, flags: ['terminus'] } };
    expect(play.reduce(done, { type: 'complete', ending: 'sell', seed: 3 }).run.carried.goodwill).toBe(1);
  });
});
