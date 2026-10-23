import { nextRandom } from './rng';

/**
 * Palette-indexed pixel art. Keys map to theme colours at draw time, so sprites re-tint with the theme.
 *   .  transparent   a  faint   b  dim   c  main   d  bright   e  accent
 */
export const PALETTE_KEYS = ['.', 'a', 'b', 'c', 'd', 'e'] as const;

export interface Sprite {
  width: number;
  height: number;
  frames: string[][];
}

export function sprite(...frames: string[][]): Sprite {
  return { width: frames[0]![0]!.length, height: frames[0]!.length, frames };
}

export interface Pixel {
  x: number;
  y: number;
  key: string;
}

export function framePixels(frame: readonly string[]): Pixel[] {
  const pixels: Pixel[] = [];
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x]!;
      if (key !== '.') pixels.push({ x, y, key });
    }
  });
  return pixels;
}

const ROW_SHIFT_CHANCE = 0.35;
const PIXEL_NOISE_CHANCE = 0.08;

/** Glitch a frame: horizontal row tearing plus stray pixels, scaled by amount (0..1). */
export function corruptFrame(frame: readonly string[], rng: number, amount: number): [string[], number] {
  if (amount <= 0) return [[...frame], rng];
  let state = rng;
  const roll = () => {
    const [value, next] = nextRandom(state);
    state = next;
    return value;
  };
  const rows = frame.map((row) => {
    let chars = [...row];
    if (roll() < ROW_SHIFT_CHANCE * amount) {
      const shift = 1 + Math.floor(roll() * 3);
      chars = [...chars.slice(-shift), ...chars.slice(0, -shift)];
    }
    return chars
      .map((ch) => (roll() < PIXEL_NOISE_CHANCE * amount ? PALETTE_KEYS[Math.floor(roll() * PALETTE_KEYS.length)]! : ch))
      .join('');
  });
  return [rows, state];
}
