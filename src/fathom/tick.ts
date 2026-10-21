import { beachPressure, tickOpenWater } from './open-water';
import { tickShallows } from './shallows';
import { tickShelf } from './shelf';
import type { Outfit } from './state';

/** One tick of the season: every open zone, shallowest first. Whatever the lab lets out makes the beach worse. */
export function tickOutfit(o: Outfit, dt: number): Outfit {
  const timed = { ...o, elapsed: o.elapsed + dt };
  return tickOpenWater(tickShelf(tickShallows(timed, dt, beachPressure(timed)), dt), dt);
}
