import { describe, it, expect } from 'vitest';
import { CREW } from '../../src/data/crew';
import { GENERATORS } from '../../src/data/extraction/generators';

describe('crew roster', () => {
  it('has seven crew with unique ids', () => {
    expect(CREW.length).toBe(7);
    expect(new Set(CREW.map((c) => c.id)).size).toBe(7);
  });

  it('gives everyone a name, role, dossier, boost description and things to say', () => {
    for (const c of CREW) {
      expect(c.name && c.role && c.dossier && c.boostText).toBeTruthy();
      expect(c.wakeLines.length).toBeGreaterThan(1);
      expect(c.exhaustedLine.length).toBeGreaterThan(0);
      expect(c.thawCost).toBeGreaterThan(0);
    }
  });

  it('only boosts generators that exist', () => {
    const ids = new Set(GENERATORS.map((g) => g.id));
    for (const c of CREW) if (c.boost.kind === 'generatorMultiplier') expect(ids.has(c.boost.generator)).toBe(true);
  });
});
