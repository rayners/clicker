import { describe, it, expect } from 'vitest';
import { CREW } from '../../src/data/crew';
import { GENERATORS } from '../../src/data/extraction/generators';
import { CREW_BOOSTS } from '../../src/data/extraction/crew-boosts';
import { SCENARIOS } from '../../src/mission/registry';

describe('crew roster', () => {
  it('has seven crew with unique ids', () => {
    expect(CREW.length).toBe(7);
    expect(new Set(CREW.map((c) => c.id)).size).toBe(7);
  });

  it('gives everyone a name, role, dossier and things to say', () => {
    for (const c of CREW) {
      expect(c.name && c.role && c.dossier).toBeTruthy();
      expect(c.wakeLines.length).toBeGreaterThan(1);
      expect(c.exhaustedLine.length).toBeGreaterThan(0);
      expect(c.thawCost).toBeGreaterThan(0);
    }
  });

  it('gives every crew member something to do in every scenario', () => {
    for (const scenario of Object.values(SCENARIOS)) {
      for (const c of CREW) expect(Boolean(scenario.crewBoostText[c.id] || c.fatigueRelief)).toBe(true);
    }
  });

  it('only boosts extraction generators that exist', () => {
    const ids = new Set(GENERATORS.map((g) => g.id));
    for (const b of Object.values(CREW_BOOSTS)) if (b.effect.kind === 'generatorMultiplier') expect(ids.has(b.effect.generator)).toBe(true);
  });
});
