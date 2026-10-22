import { describe, it, expect } from 'vitest';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { completeCharter, DRAGON_UNLOCK_CHARTERS, isDragonUnlocked, isKeepUnlocked, isWoodUnlocked, KEEP_UNLOCK_CHARTERS, WOOD_UNLOCK_CHARTERS } from '../../src/forest/charter';
import { reduce } from '../../src/forest/store';

const NOW = 1_000_000;
const after = (n: number): ForestGame => {
  const g = createForestGame(1, NOW);
  return { ...g, profile: { ...g.profile, chartersCompleted: n } };
};

describe('Elderdark opens up charter by charter', () => {
  it('starts every new company in the forest, and opens the Keep after one charter, the wood after two, the dragon after four', () => {
    expect([KEEP_UNLOCK_CHARTERS, WOOD_UNLOCK_CHARTERS, DRAGON_UNLOCK_CHARTERS]).toEqual([1, 2, 4]);
    expect(isKeepUnlocked(after(0).profile)).toBe(false);
    expect(isKeepUnlocked(after(1).profile)).toBe(true);
    expect(isWoodUnlocked(after(1).profile)).toBe(false);
    expect(isWoodUnlocked(after(2).profile)).toBe(true);
    expect(isDragonUnlocked(after(3).profile)).toBe(false);
    expect(isDragonUnlocked(after(4).profile)).toBe(true);
  });

  it('will not tear up a charter for the Keep before it is open', () => {
    const g = after(0);
    expect(reduce(g, { type: 'rewriteCharter', site: 'keep', seed: 2 })).toBe(g);
    expect(reduce(after(1), { type: 'rewriteCharter', site: 'keep', seed: 2 }).company.site).toBe('keep');
  });

  it('lets the first reckoning send the next charter to the Keep, since finishing it is what opens the Keep', () => {
    const g = after(0);
    const due = { ...g, company: { ...g.company, flags: ['terminus'] } };
    expect(completeCharter(due, 'sell', 3, 'keep').company.site).toBe('keep');
  });

  it('will not wake the wood or the dragon before their time', () => {
    expect(reduce(after(1), { type: 'startWood', seed: 1 }).mode).toBe('charter');
    expect(reduce(after(2), { type: 'startWood', seed: 1 }).mode).toBe('wood');
    expect(reduce(after(3), { type: 'wakeDragon', seed: 1 }).mode).toBe('charter');
    expect(reduce(after(4), { type: 'wakeDragon', seed: 1 }).mode).toBe('dragon');
  });
});
