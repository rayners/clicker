import { describe, it, expect } from 'vitest';
import { memoByState } from '../../src/engine/memo';

describe('memoising a derived value per immutable state', () => {
  it('computes once per state object, and again for a new one', () => {
    let calls = 0;
    const derive = memoByState((s: { n: number }) => {
      calls++;
      return { double: s.n * 2 };
    });
    const a = { n: 2 };
    expect(derive(a).double).toBe(4);
    expect(derive(a)).toBe(derive(a));
    expect(calls).toBe(1);
    expect(derive({ ...a, n: 3 }).double).toBe(6);
    expect(calls).toBe(2);
  });
});
