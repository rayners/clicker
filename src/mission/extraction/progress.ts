import type { MissionState } from '../state';

// Fitted so a typical first contract crosses 1,000 m around the one-hour mark
// and breaks into the 3,200 m cavity around two and a half hours (see tests/sim/pacing.test.ts).
const DEPTH_SCALE = 0.0432;
const DEPTH_EXPONENT = 5.48;

/** Shaft depth in metres: the diegetic progress measure that gates the story. */
export function depth(m: MissionState): number {
  return Math.floor(DEPTH_SCALE * Math.log10(1 + m.lifetimeOre) ** DEPTH_EXPONENT);
}
