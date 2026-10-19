import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/game';
import { applyScenario, SCENARIOS } from '../../src/core/debug';
import { depth } from '../../src/mission/progress';
import { isSpecialProjectsUnlocked } from '../../src/mission/containment';

const base = () => createGame(1, 0);

describe('debug scenarios', () => {
  it('offers a jump to the start of each act', () => {
    expect(SCENARIOS).toEqual(expect.arrayContaining(['act2', 'act3', 'act4', 'terminus']));
  });

  it('act2 lands past the 1,000 m entry point', () => {
    const g = applyScenario(base(), 'act2');
    expect(g.mission.act).toBe(2);
    expect(depth(g.mission)).toBeGreaterThanOrEqual(1000);
  });

  it('act3 opens special projects', () => {
    const g = applyScenario(base(), 'act3');
    expect(g.mission.act).toBe(3);
    expect(isSpecialProjectsUnlocked(g.mission)).toBe(true);
  });

  it('act4 has contacts aboard and tracking on', () => {
    const g = applyScenario(base(), 'act4');
    expect(g.mission.act).toBe(4);
    expect(g.mission.contacts).toBeGreaterThan(0);
    expect(g.mission.flags).toContain('tracker');
  });

  it('terminus offers the ending', () => {
    expect(applyScenario(base(), 'terminus').mission.flags).toContain('terminus');
  });

  it('ignores unknown scenarios', () => {
    const g = base();
    expect(applyScenario(g, 'nope')).toBe(g);
  });
});
