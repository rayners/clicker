import { describe, it, expect } from 'vitest';
import { DIRECTIVES } from '../../src/data/extraction/directives';
import { GENERATORS } from '../../src/data/extraction/generators';

describe('directive table', () => {
  it('has unique ids', () => {
    expect(new Set(DIRECTIVES.map((d) => d.id)).size).toBe(DIRECTIVES.length);
  });

  it('unlocks in order of progress', () => {
    for (let i = 1; i < DIRECTIVES.length; i++) {
      expect(DIRECTIVES[i]!.unlockOre).toBeGreaterThan(DIRECTIVES[i - 1]!.unlockOre);
    }
  });

  it('has positive rewards, durations and targets, and real generator ids', () => {
    const ids = new Set(GENERATORS.map((g) => g.id));
    for (const d of DIRECTIVES) {
      expect(d.reward).toBeGreaterThan(0);
      expect(d.duration).toBeGreaterThan(0);
      expect(d.goal.target).toBeGreaterThan(0);
      if (d.goal.kind === 'ownGenerators') expect(ids.has(d.goal.generator)).toBe(true);
      expect(d.title && d.brief && d.lag).toBeTruthy();
    }
  });
});
