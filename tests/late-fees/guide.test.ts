// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { lateGuideRules, lateGuideSteps } from '../../src/late-fees-data/guide';
import { createLateGame } from '../../src/late-fees/game';
import { chooseTape } from '../../src/late-fees/sequels';
import type { VenueId } from '../../src/late-fees/state';

describe('the LATE FEES guide', () => {
  for (const venue of ['camp', 'clinic', 'insurer', 'asylum'] as VenueId[]) {
    it(`${venue}: starts on the big button, has its own levers and a rules page, and points only at real-looking controls`, () => {
      const g = chooseTape(createLateGame(1, 0), venue, 1);
      const steps = lateGuideSteps(g);
      expect(steps.length).toBeGreaterThanOrEqual(5);
      expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
      expect(steps[0]!.show(g) && !steps[0]!.done(g)).toBe(true);
      for (const s of steps) if (s.target) expect(() => document.querySelector(s.target!)).not.toThrow();
      expect(lateGuideRules(g).sections.length).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('the camp guide', () => {
  it('counts the whistle as blown once the first zone starts to open', async () => {
    const { reduce } = await import('../../src/late-fees/store');
    const g = createLateGame(1, 0);
    const blown = reduce(g, { type: 'whistle' });
    expect(lateGuideSteps(blown)[0]!.done(blown)).toBe(true);
  });
});
