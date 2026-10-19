import { describe, it, expect } from 'vitest';
import { UPGRADES } from '../../src/data/extraction/upgrades';
import { GENERATORS } from '../../src/data/extraction/generators';

describe('upgrade table', () => {
  it('has unique ids', () => {
    const ids = UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only targets generators that exist', () => {
    const genIds = new Set(GENERATORS.map((g) => g.id));
    for (const u of UPGRADES) {
      if (u.effect.kind === 'generatorMultiplier') expect(genIds.has(u.effect.generator)).toBe(true);
      if (u.unlock.generator) expect(genIds.has(u.unlock.generator.id)).toBe(true);
    }
  });

  it('gives every generator at least two tier upgrades', () => {
    for (const g of GENERATORS) {
      const count = UPGRADES.filter((u) => u.effect.kind === 'generatorMultiplier' && u.effect.generator === g.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('has positive costs and multipliers that actually help', () => {
    for (const u of UPGRADES) {
      expect(u.cost).toBeGreaterThan(0);
      expect(u.effect.value).toBeGreaterThan(0);
      expect(u.name.length).toBeGreaterThan(0);
      expect(u.description.length).toBeGreaterThan(0);
    }
  });
});
