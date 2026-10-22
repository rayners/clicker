// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { guideRules, guideSteps } from '../../src/data/guide';
import { createGame } from '../../src/core/game';
import { createMission, type MissionState, type ScenarioId } from '../../src/mission/state';
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

  it('introduces the sick bay on an outbreak contract, and adds the outbreak to the rules after the discovery', () => {
    const g = createGame(1, 0);
    const mission = (patch: object) => ({ ...createMission({ ...missionConfigFor(g.profile, 'extraction'), horror: 'outbreak' }, 1), ...patch }) as MissionState;
    const at = (patch: object) => ({ ...g, mission: mission(patch) });
    const showing = (s: ReturnType<typeof at>) => guideSteps(s).filter((st) => st.show(s) && !st.done(s)).map((st) => st.id);
    expect(showing(at({}))).not.toContain('sick-bay');
    expect(showing(at({ act: 2 }))).toContain('sick-bay');
    expect(showing(at({ act: 3, flags: ['outbreak'] }))).toContain('quarantine');
    expect(showing(at({ act: 4, flags: ['outbreak'], turned: 0.1 }))).toContain('lockdown');
    expect(guideRules(at({ act: 2 })).sections.map((x) => x.heading)).not.toContain('THE OUTBREAK');
    expect(guideRules(at({ act: 3, flags: ['outbreak'] })).sections.map((x) => x.heading)).toContain('THE OUTBREAK');
  });
});
