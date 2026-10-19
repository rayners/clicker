import { describe, it, expect } from 'vitest';
import { GENERATORS } from '../../src/data/generators';

describe('generator table', () => {
  it('has unique ids', () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gets strictly more expensive and more productive with each tier', () => {
    for (let i = 1; i < GENERATORS.length; i++) {
      expect(GENERATORS[i]!.baseCost).toBeGreaterThan(GENERATORS[i - 1]!.baseCost);
      expect(GENERATORS[i]!.baseRate).toBeGreaterThan(GENERATORS[i - 1]!.baseRate);
    }
  });

  it('makes higher tiers slightly less cost-efficient so cheap tiers stay relevant early', () => {
    const efficiency = GENERATORS.map((g) => g.baseRate / g.baseCost);
    for (let i = 1; i < efficiency.length; i++) {
      expect(efficiency[i]).toBeLessThan(efficiency[i - 1]!);
    }
  });

  it('has a name and description for every tier', () => {
    for (const g of GENERATORS) {
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
    }
  });
});

describe('generator short names', () => {
  it('fit a narrow phone monitor row', () => {
    for (const g of GENERATORS) {
      expect(g.short.length).toBeGreaterThan(0);
      expect(g.short.length).toBeLessThanOrEqual(8);
    }
  });
});
