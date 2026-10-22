// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { forestGuideRules, forestGuideSteps } from '../../src/forest-data/guide';
import { createForestGame } from '../../src/forest/game';
import { createCompany } from '../../src/forest/state';

describe('the Elderdark guide', () => {
  for (const site of ['forest', 'keep'] as const) {
    it(`${site}: starts with foraging, has its own levers and a rules page, and points only at real-looking controls`, () => {
      const g = { ...createForestGame(1, 0), company: createCompany(1, undefined, site) };
      const steps = forestGuideSteps(g);
      expect(steps.length).toBeGreaterThanOrEqual(6);
      expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
      expect(steps[0]!.id).toBe('forage');
      expect(steps[0]!.show(g) && !steps[0]!.done(g)).toBe(true);
      for (const s of steps) if (s.target) expect(() => document.querySelector(s.target!)).not.toThrow();
      expect(forestGuideRules(g).sections.length).toBeGreaterThanOrEqual(4);
    });
  }
});
