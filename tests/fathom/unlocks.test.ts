import { describe, it, expect } from 'vitest';
import { createFathomGame } from '../../src/fathom/game';
import { DEEP_UNLOCK_SEASONS, isDeepUnlocked } from '../../src/fathom/deep';
import { reduce } from '../../src/fathom/store';
import { applyFathomScenario } from '../../src/fathom/debug';

const after = (n: number) => {
  const g = createFathomGame(1, 0);
  return { ...g, profile: { ...g.profile, seasons: n } };
};

describe('the Source answers only an outfit with seasons behind it', () => {
  it('opens after two finished seasons', () => {
    expect(DEEP_UNLOCK_SEASONS).toBe(2);
    expect(isDeepUnlocked(after(1).profile)).toBe(false);
    expect(reduce(after(1), { type: 'startDeep', seed: 1 }).mode).toBe('season');
    expect(reduce(after(2), { type: 'startDeep', seed: 1 }).mode).toBe('deep');
  });

  it('has a dev-only veteran jump that opens it', () => {
    expect(isDeepUnlocked(applyFathomScenario(createFathomGame(1, 0), 'veteran').profile)).toBe(true);
    const g = createFathomGame(1, 0);
    expect(applyFathomScenario(g, 'nope')).toBe(g);
  });
});
