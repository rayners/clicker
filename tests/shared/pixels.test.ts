import { describe, it, expect } from 'vitest';
import { framePixels, corruptFrame, PALETTE_KEYS } from '../../src/shared/pixels';

const frame = ['.ab.', 'cddc', '.ee.'];

describe('framePixels', () => {
  it('lists the coloured pixels and skips transparent ones', () => {
    const pixels = framePixels(frame);
    expect(pixels).toContainEqual({ x: 1, y: 0, key: 'a' });
    expect(pixels).toContainEqual({ x: 3, y: 1, key: 'c' });
    expect(pixels.some((p) => p.key === '.')).toBe(false);
    expect(pixels.length).toBe(8);
  });
});

describe('corruptFrame', () => {
  const big = Array.from({ length: 16 }, () => 'abcdeabcdeabcdea');

  it('leaves the frame untouched at zero corruption', () => {
    expect(corruptFrame(big, 123, 0)[0]).toEqual(big);
  });

  it('is deterministic for a given rng state', () => {
    expect(corruptFrame(big, 99, 0.6)).toEqual(corruptFrame(big, 99, 0.6));
  });

  it('visibly damages the frame at high corruption, keeping its size and palette', () => {
    const [damaged, rng] = corruptFrame(big, 7, 1);
    expect(damaged).not.toEqual(big);
    expect(rng).not.toBe(7);
    expect(damaged.length).toBe(big.length);
    for (const row of damaged) {
      expect(row.length).toBe(16);
      for (const ch of row) expect(PALETTE_KEYS).toContain(ch);
    }
  });
});
