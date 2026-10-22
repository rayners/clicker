// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { fathomGuideRules, fathomGuideSteps } from '../../src/fathom-data/guide';
import { createFathomGame } from '../../src/fathom/game';

describe('the DOWN THERE guide', () => {
  it('starts on the beach pass, covers every zone, has a rules page, and points only at real-looking controls', () => {
    const g = createFathomGame(1, 0);
    const steps = fathomGuideSteps(g);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    expect(steps[0]!.show(g) && !steps[0]!.done(g)).toBe(true);
    for (const tab of ['beach', 'shelf', 'station', 'trench', 'coast']) expect(steps.some((s) => s.target === `#fa-tab-${tab}`)).toBe(true);
    for (const s of steps) if (s.target) expect(() => document.querySelector(s.target!)).not.toThrow();
    expect(fathomGuideRules(g).sections.length).toBeGreaterThanOrEqual(6);
  });

  it('shows nothing while the player is the Source', () => {
    const g = { ...createFathomGame(1, 0), mode: 'deep' as const };
    expect(fathomGuideSteps(g).some((s) => s.show(g))).toBe(false);
  });
});
