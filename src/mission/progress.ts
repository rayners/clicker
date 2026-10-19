import type { MissionState } from './state';

const DEPTH_SCALE = 40;

/** Shaft depth in metres: the diegetic progress measure that gates the story. */
export function depth(m: MissionState): number {
  return Math.floor(DEPTH_SCALE * Math.log10(1 + m.lifetimeOre) ** 2);
}
