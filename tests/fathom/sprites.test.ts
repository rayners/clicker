import { describe, it, expect } from 'vitest';
import { FATHOM_SPRITES } from '../../src/fathom-data/sprites';
import { PALETTE_KEYS } from '../../src/shared/pixels';

describe('the deep-water game\'s sprites', () => {
  for (const [name, s] of Object.entries(FATHOM_SPRITES)) {
    it(`${name}: every frame matches its size and uses only palette characters`, () => {
      for (const frame of s.frames) {
        expect(frame.length).toBe(s.height);
        for (const row of frame) {
          expect(row.length).toBe(s.width);
          for (const ch of row) expect(PALETTE_KEYS).toContain(ch);
        }
      }
    });
  }
});
