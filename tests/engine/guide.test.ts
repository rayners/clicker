import { describe, it, expect } from 'vitest';
import { createGuideProgress, nextStep, type GuideStep } from '../../src/engine/guide';

interface S {
  cash: number;
  drills: number;
}
const steps: GuideStep<S>[] = [
  { id: 'drill', title: 'DRILL', text: 'Tap drill.', show: () => true, done: (s) => s.drills > 0 },
  { id: 'buy', title: 'BUY', text: 'Buy a drone.', show: (s) => s.cash >= 10, done: () => false },
];

describe('the guide', () => {
  it('offers the first step that applies and has not been done', () => {
    expect(nextStep(steps, { cash: 0, drills: 0 }, [])?.id).toBe('drill');
  });

  it('moves on as soon as the player does the thing, without being told', () => {
    expect(nextStep(steps, { cash: 0, drills: 1 }, [])).toBeNull();
    expect(nextStep(steps, { cash: 20, drills: 1 }, [])?.id).toBe('buy');
  });

  it('never shows a step again once it has been dismissed', () => {
    expect(nextStep(steps, { cash: 20, drills: 1 }, ['buy'])).toBeNull();
  });

  it('remembers what was seen, and whether the guide was skipped, on this device only', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as unknown as Storage;
    const p = createGuideProgress(storage, 'test.guide');
    expect(p.seen()).toEqual([]);
    p.see('drill');
    p.see('drill');
    expect(createGuideProgress(storage, 'test.guide').seen()).toEqual(['drill']);
    expect(p.skipped()).toBe(false);
    p.skip();
    expect(createGuideProgress(storage, 'test.guide').skipped()).toBe(true);
    p.reset();
    expect(createGuideProgress(storage, 'test.guide').seen()).toEqual([]);
  });

  it('carries on with nothing remembered when storage cannot be read', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as unknown as Storage;
    const p = createGuideProgress(broken, 'x');
    expect(p.seen()).toEqual([]);
    p.see('drill');
    expect(p.seen()).toEqual(['drill']);
  });
});
