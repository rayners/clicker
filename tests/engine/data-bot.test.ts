import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compileGame } from '../../src/engine/data/game';
import { parseDuration, playDataGame } from '../../src/engine/data/bot';
import type { GameDefinition } from '../../src/engine/data/definition';

const GAMES = resolve(__dirname, '../../games');
const definitions = readdirSync(GAMES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, def: JSON.parse(readFileSync(join(GAMES, f), 'utf8')) as GameDefinition }));

describe('the generic bot for games made of data', () => {
  it('reads pacing durations written as seconds, minutes or hours', () => {
    expect(parseDuration('45s')).toBe(45);
    expect(parseDuration('10m')).toBe(600);
    expect(parseDuration('4h')).toBe(14_400);
  });

  it('plays a game with no market by buying what it can afford, cheapest first', () => {
    const game = compileGame({
      id: 'coins',
      version: 1,
      title: 'COINS',
      resources: { coins: { label: 'COINS' }, total: { label: 'TOTAL', lifetime: 'coins' } },
      press: { label: 'DIG', converts: { coins: 1 } },
      items: [{ id: 'digger', label: 'DIGGER', text: 'Digs.', cost: { resource: 'coins', base: 10, growth: 1.15 }, converts: { coins: 1 }, rate: 1 }],
      story: { beats: [{ id: 'rich', when: 'total >= 5000', text: 'Rich.', ends: true }] },
    });
    const run = playDataGame(game, { seed: 1, maxSeconds: 3600 });
    expect(run.final.owned.digger).toBeGreaterThan(5);
    expect(run.doneAt).toBeDefined();
  });

  for (const { file, def } of definitions) {
    it(`plays ${file} through to its end inside the pacing targets the file declares`, () => {
      const game = compileGame(def);
      const targets = def.pacing?.targets ?? {};
      const end = targets.end ? parseDuration(targets.end[1]) : 8 * 3600;
      const run = playDataGame(game, { seed: 1, maxSeconds: end * 1.5 });
      for (const [key, [from, to]] of Object.entries(targets)) {
        const at = key === 'end' ? run.doneAt : run.actAt[Number(key.replace('act', ''))];
        expect({ key, at }).toEqual({ key, at: expect.any(Number) });
        expect(at!).toBeGreaterThanOrEqual(parseDuration(from));
        expect(at!).toBeLessThanOrEqual(parseDuration(to));
      }
    });
  }
});
