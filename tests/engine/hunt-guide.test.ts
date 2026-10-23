import { describe, it, expect } from 'vitest';
import { createHunt, type HuntState } from '../../src/engine/hunt';
import { nextStep } from '../../src/engine/guide';
import { huntGuide, type HuntWords } from '../../src/engine/hunt-guide';

const WORDS: HuntWords = {
  title: 'THE WOOD',
  prey: 'charter',
  harvest: 'SAP',
  notoriety: 'FEAR',
  root: '.wood',
  push: '[aria-label^="Lean harder on"]',
  rest: 'SLEEP',
  growth: 'WHAT THE WOOD BECOMES',
};
type S = { hunt: HuntState<number> | null };
const guide = huntGuide<S>((s) => s.hunt, WORDS);
const fresh = (): S => ({ hunt: createHunt([0, 0, 0], { strength: 3, hunger: 100 }) });
const next = (s: S, seen: string[] = []) => nextStep(guide.steps(s), s, seen);

describe('the hunt guide, shared by every play-as-the-horror tier', () => {
  it('starts by pointing at the first prey to push', () => {
    const step = next(fresh())!;
    expect(step.target).toBe('.wood [aria-label^="Lean harder on"]');
    expect(step.text).toMatch(/charter/i);
  });

  it('moves on to hunger once the horror is pushing', () => {
    const s = fresh();
    const pushing = { hunt: { ...s.hunt!, split: [1, 0, 0] } };
    expect(next(pushing)!.title).toMatch(/HUNGER/);
  });

  it('explains what the harvest buys, notoriety, and ending for Legend as each comes up, in the tier\'s own words', () => {
    const h = { ...fresh().hunt!, split: [1, 0, 0], harvest: 100, dread: 100, notoriety: 1 };
    const titles = guide.steps({ hunt: h }).filter((st) => st.show({ hunt: h })).map((st) => `${st.title} ${st.text}`).join(' ');
    expect(titles).toMatch(/SAP/);
    expect(titles).toMatch(/FEAR/);
    expect(titles).toMatch(/LEGEND/);
    expect(titles).toMatch(/SLEEP/);
  });

  it('shows nothing when the tier is not open', () => {
    expect(guide.steps({ hunt: null }).some((st) => st.show({ hunt: null }))).toBe(false);
  });

  it('has a rules page titled for the tier, covering strength, hunger, the harvest, notoriety, the prey\'s end and Legend', () => {
    const rules = guide.rules(fresh());
    expect(rules.title).toBe('HOW THE WOOD WORKS');
    const headings = rules.sections.map((s) => s.heading);
    for (const h of ['STRENGTH', 'HUNGER', 'SAP', 'FEAR', 'LEGEND']) expect(headings).toContain(h);
    expect(rules.sections.map((s) => s.text).join(' ')).toMatch(/charter/i);
  });
});
