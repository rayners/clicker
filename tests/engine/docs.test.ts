import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ENGINE = resolve(__dirname, '../../src/engine');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

const DECLARATION = /^export (?:async )?(?:function|const|let|interface|type|class|enum) (\w+)/;

/** Every exported declaration in the engine with no doc comment directly above it, as `file: name`. */
function undocumented(): string[] {
  return files(ENGINE).flatMap((file) => {
    const lines = readFileSync(file, 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      const name = DECLARATION.exec(line)?.[1];
      if (!name) return [];
      let j = i - 1;
      while (j >= 0 && lines[j]!.trim() === '') j--;
      return lines[j]?.trim().endsWith('*/') ? [] : [`${relative(ENGINE, file)}: ${name}`];
    });
  });
}

describe('engine documentation', () => {
  it('gives every exported function, type and constant in the engine a doc comment, for the generated pages', () => {
    expect(undocumented()).toEqual([]);
  });

  it('has a README saying what the engine offers and how a game plugs into it', () => {
    const readme = readFileSync(join(ENGINE, 'README.md'), 'utf8');
    for (const module of files(ENGINE).map((f) => relative(ENGINE, f).replace(/\.ts$/, ''))) expect(readme).toContain(module);
    expect(readme).toMatch(/runGame/);
  });
});
