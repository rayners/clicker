import type { Outfit } from './state';

// The shared story scale (DEEP CONTRACT's metres): 1,000 opens act 2, 3,200 the discovery. Here it really is depth.
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

/** How deep the outfit has gone, in metres: it grows with everything the season has earned. */
export function depth(o: Outfit): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + o.lifetimeCash) ** PROGRESS_EXPONENT);
}
