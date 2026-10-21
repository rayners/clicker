import { tickShallows } from './shallows';
import { tickShelf } from './shelf';
import type { Outfit } from './state';

/** One tick of the season: every open zone, shallowest first. */
export function tickOutfit(o: Outfit, dt: number): Outfit {
  const timed = { ...o, elapsed: o.elapsed + dt };
  return tickShelf(tickShallows(timed, dt), dt);
}
