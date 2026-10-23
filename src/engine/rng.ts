/**
 * A seeded random number generator whose whole state fits in a save.
 * @module
 */
// mulberry32: tiny, fast, and its whole state is one 32-bit integer we can persist in saves.
/**
 * One step of mulberry32: a value in [0, 1) and the next state. The state is a single 32-bit integer, so it can
 * live in a save and replay deterministically.
 */
export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** A whole number from `min` to `max` inclusive, and the next state. */
export function randomInt(state: number, min: number, max: number): [value: number, nextState: number] {
  const [value, next] = nextRandom(state);
  return [min + Math.floor(value * (max - min + 1)), next];
}
