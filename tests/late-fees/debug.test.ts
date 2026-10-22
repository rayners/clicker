import { describe, it, expect } from 'vitest';
import { newLateGame } from '../../src/late-fees/game';
import { applyLateScenario, LATE_SCENARIOS } from '../../src/late-fees/debug';

describe('LATE FEES debug jumps (dev builds only)', () => {
  it('has a member jump that stocks the whole shelf and side B', () => {
    const g = applyLateScenario(newLateGame(1, 0), 'member');
    expect(g.profile.sequels).toBeGreaterThanOrEqual(10);
    expect(g.shelf).toBe(true);
    expect(LATE_SCENARIOS).toContain('member');
  });

  it('leaves the game alone for a jump it does not know', () => {
    const g = newLateGame(1, 0);
    expect(applyLateScenario(g, 'nope')).toBe(g);
  });
});
