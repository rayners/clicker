import { describe, it, expect } from 'vitest';
import { hasShape } from '../../src/shared/save';
import { createGame } from '../../src/core/game';
import { deserialize as contractDeserialize, serialize as contractSerialize } from '../../src/core/save';
import { forestSaves } from '../../src/forest/save';
import { createForestGame } from '../../src/forest/game';
import { lateSaves } from '../../src/late-fees/save';
import { createLateGame } from '../../src/late-fees/game';
import { fathomSaves } from '../../src/fathom/save';
import { createFathomGame } from '../../src/fathom/game';

describe('telling a whole save from a damaged one', () => {
  it('checks every field a fresh state has, one level down, by kind', () => {
    const ref = { a: 1, b: { c: 2 }, list: [1], maybe: null };
    expect(hasShape({ a: 5, b: {}, list: [], maybe: 3 }, ref)).toBe(true);
    expect(hasShape({ a: 5, list: [] }, ref)).toBe(false);
    expect(hasShape({ a: 'x', b: {}, list: [] }, ref)).toBe(false);
    expect(hasShape({ a: 5, b: {}, list: {} }, ref)).toBe(false);
    expect(hasShape(undefined, ref)).toBe(false);
  });

  const broken = (text: string, path: string[]) => {
    const raw = JSON.parse(text);
    let at = raw;
    for (const k of path.slice(0, -1)) at = at[k];
    if (path.length === 1) raw[path[0]!] = {};
    else delete at[path.at(-1)!];
    return JSON.stringify(raw);
  };

  it('refuses a DEEP CONTRACT save with a field missing from its contract', () => {
    const text = contractSerialize(createGame(1, 0));
    expect(() => contractDeserialize(text)).not.toThrow();
    expect(() => contractDeserialize(broken(text, ['mission', 'crew']))).toThrow();
  });

  it('refuses damaged saves for the other three games, and accepts their whole ones', () => {
    const cases: [{ serialize(g: never): string; deserialize(t: string): unknown }, object, string][] = [
      [forestSaves as never, createForestGame(1, 0), 'company'],
      [lateSaves as never, createLateGame(1, 0), 'run'],
      [fathomSaves as never, createFathomGame(1, 0), 'outfit'],
    ];
    for (const [saves, game, section] of cases) {
      const text = saves.serialize(game as never);
      expect(() => saves.deserialize(text)).not.toThrow();
      expect(() => saves.deserialize(broken(text, [section]))).toThrow();
    }
  });
});
