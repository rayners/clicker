// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { guideRules, guideSteps } from '../../src/data/guide';
import { createGame } from '../../src/core/game';
import { createMission, type ScenarioId } from '../../src/mission/state';
import { missionConfigFor } from '../../src/core/prestige';

const SCENARIOS: ScenarioId[] = ['overland', 'extraction', 'haulage', 'terraform', 'security', 'salvage'];
const on = (scenario: ScenarioId) => {
  const g = createGame(1, 0);
  return { ...g, mission: createMission(missionConfigFor(g.profile, scenario), 1) };
};

describe('the DEEP CONTRACT guide', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario}: introduces its own levers first, with a rules page, and points only at real-looking controls`, () => {
      const g = on(scenario);
      const steps = guideSteps(g);
      expect(steps.length).toBeGreaterThanOrEqual(5);
      expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
      expect(steps[0]!.show(g)).toBe(true);
      expect(steps[0]!.done(g)).toBe(false);
      for (const s of steps) if (s.target) expect(() => document.querySelector(s.target!)).not.toThrow();
      const rules = guideRules(g);
      expect(rules.sections.length).toBeGreaterThanOrEqual(3);
      expect(rules.title).toMatch(/^HOW /);
    });
  }
});
