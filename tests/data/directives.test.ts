import { describe, it, expect } from 'vitest';
import { DIRECTIVES } from '../../src/data/extraction/directives';
import { GENERATORS } from '../../src/data/extraction/generators';
import { SCENARIOS } from '../../src/mission/registry';
import { createMission, DEFAULT_MISSION_CONFIG } from '../../src/mission/state';

describe('directive table', () => {
  it('has unique ids', () => {
    expect(new Set(DIRECTIVES.map((d) => d.id)).size).toBe(DIRECTIVES.length);
  });

  it('unlocks in order of progress', () => {
    for (let i = 1; i < DIRECTIVES.length; i++) {
      expect(DIRECTIVES[i]!.unlockCredits).toBeGreaterThan(DIRECTIVES[i - 1]!.unlockCredits);
    }
  });

  it('has positive rewards, durations and targets, and real generator ids', () => {
    const ids = new Set(GENERATORS.map((g) => g.id));
    for (const d of DIRECTIVES) {
      expect(d.reward).toBeGreaterThan(0);
      expect(d.duration).toBeGreaterThan(0);
      expect(d.goal.target).toBeGreaterThan(0);
      if (d.goal.metric.startsWith('gen:')) expect(ids.has(d.goal.metric.slice(4))).toBe(true);
      expect(d.title && d.brief && d.lag).toBeTruthy();
    }
  });
});

describe('every contract that can turn has orders for the turn', () => {
  for (const s of Object.values(SCENARIOS).filter((x) => x.id !== 'overland')) {
    it(`${s.id}: darker orders held back for acts 3 and 4, still in order of progress, asking for things the contract can count`, () => {
      expect(s.directives.filter((d) => (d.minAct ?? 1) >= 3).length).toBeGreaterThanOrEqual(2);
      expect(s.directives.some((d) => d.minAct === 4)).toBe(true);
      for (let i = 1; i < s.directives.length; i++) expect(s.directives[i]!.unlockCredits).toBeGreaterThan(s.directives[i - 1]!.unlockCredits);
      const m = createMission({ ...DEFAULT_MISSION_CONFIG, scenario: s.id as never }, 1);
      for (const d of s.directives.filter((x) => x.minAct)) {
        if (d.goal.metric !== 'credits') expect(typeof s.metric(m, d.goal.metric), d.id).toBe('number');
        expect(d.reward).toBeGreaterThan(0);
      }
    });
  }
});
