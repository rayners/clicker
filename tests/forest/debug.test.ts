import { describe, it, expect } from 'vitest';
import { createForestGame } from '../../src/forest/game';
import { applyForestScenario, FOREST_SCENARIOS } from '../../src/forest/debug';
import { tickCompany } from '../../src/forest/company';

describe('Elderdark debug jumps', () => {
  it('starts a Keep charter with hands and silver to try it with (?debug=keep)', () => {
    const c = applyForestScenario(createForestGame(1, 0), 'keep').company;
    expect(c.site).toBe('keep');
    expect(c.hired.blade).toBeGreaterThan(0);
    expect(c.silver).toBeGreaterThan(100);
  });

  it('jumps deep into a Keep charter, floors taken and held, in Act II (?debug=keep-deep)', () => {
    const c = applyForestScenario(createForestGame(1, 0), 'keep-deep').company;
    expect(c.act).toBe(2);
    const held = c.floors.filter((f) => f.secured).length;
    expect(held).toBeGreaterThanOrEqual(5);
    // Garrisoned well enough that the floors are still held a few minutes later.
    let later = c;
    for (let t = 0; t < 300; t++) later = tickCompany(later, 1);
    expect(later.floors.filter((f) => f.secured).length).toBe(held);
  });

  it('leaves the game alone for an unknown jump, and lists the ones it knows', () => {
    const g = createForestGame(1, 0);
    expect(applyForestScenario(g, 'nonsense')).toBe(g);
    expect(FOREST_SCENARIOS).toEqual(['keep', 'keep-deep']);
  });
});
