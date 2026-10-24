import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Every relative import in src, as [importing file, imported file], both relative to src. */
const edges = files(SRC).flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)].map(
    (m) => [relative(SRC, file), relative(SRC, resolve(dirname(file), m[1]!))] as const,
  ),
);

const area = (path: string) => {
  if (path.startsWith('engine/')) return 'engine';
  // The About page sits with the picker: engine code only.
  if (path.startsWith('picker') || path.startsWith('about')) return 'picker';
  // The example game, built from the engine's docs: engine code only, and no game may lean on it.
  if (path.startsWith('clips')) return 'clips';
  // The page of games made of data: engine code only.
  if (path.startsWith('made')) return 'made';
  if (path.startsWith('late-fees')) return 'late-fees';
  if (path.startsWith('fathom')) return 'fathom';
  if (path.startsWith('forest')) return 'elderdark';
  return 'deep-contract';
};

describe('code boundaries between the engine and the games', () => {
  it('keeps the engine (src/engine) free of either game', () => {
    const leaks = edges.filter(([from, to]) => area(from) === 'engine' && area(to) !== 'engine');
    expect(leaks).toEqual([]);
  });

  it('keeps DEEP CONTRACT from importing Elderdark', () => {
    const leaks = edges.filter(([from, to]) => area(from) === 'deep-contract' && area(to) === 'elderdark');
    expect(leaks).toEqual([]);
  });

  it('keeps Elderdark from importing DEEP CONTRACT', () => {
    const leaks = edges.filter(([from, to]) => area(from) === 'elderdark' && area(to) === 'deep-contract');
    expect(leaks).toEqual([]);
  });

  it('keeps the game picker out of both games: it only links to them', () => {
    const leaks = edges.filter(([from, to]) => area(from) === 'picker' && area(to) !== 'engine' && area(to) !== 'picker');
    expect(leaks).toEqual([]);
  });

  it('keeps LATE FEES to itself and the engine (src/engine), and the other games out of it', () => {
    const outward = edges.filter(([from, to]) => area(from) === 'late-fees' && area(to) !== 'engine' && area(to) !== 'late-fees');
    const inward = edges.filter(([from, to]) => area(from) !== 'late-fees' && area(to) === 'late-fees');
    expect(outward).toEqual([]);
    expect(inward).toEqual([]);
  });

  it('keeps the deep-water game to itself and the engine (src/engine), and the other games out of it', () => {
    const outward = edges.filter(([from, to]) => area(from) === 'fathom' && area(to) !== 'engine' && area(to) !== 'fathom');
    const inward = edges.filter(([from, to]) => area(from) !== 'fathom' && area(to) === 'fathom');
    expect(outward).toEqual([]);
    expect(inward).toEqual([]);
  });

  it('keeps the example game, CLIP WORKS, to the engine alone, and every game out of it', () => {
    const outward = edges.filter(([from, to]) => area(from) === 'clips' && area(to) !== 'engine' && area(to) !== 'clips');
    const inward = edges.filter(([from, to]) => area(from) !== 'clips' && area(to) === 'clips');
    expect([...outward, ...inward]).toEqual([]);
  });

  it('keeps the page of games made of data to the engine alone', () => {
    const outward = edges.filter(([from, to]) => area(from) === 'made' && area(to) !== 'engine' && area(to) !== 'made');
    expect(outward).toEqual([]);
  });
});
