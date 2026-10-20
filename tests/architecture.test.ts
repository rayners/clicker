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
  if (path.startsWith('shared/')) return 'shared';
  if (path.startsWith('forest')) return 'elderdark';
  return 'deep-contract';
};

describe('code boundaries between the two games', () => {
  it('keeps the shared engine free of either game', () => {
    const leaks = edges.filter(([from, to]) => area(from) === 'shared' && area(to) !== 'shared');
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
});
