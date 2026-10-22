import { beachPressure, tickOpenWater } from './open-water';
import { tickShallows } from './shallows';
import { tickShelf } from './shelf';
import { tickTrench } from './trench';
import { tickBreach } from './breach';
import { runFathomStory } from './story';
import type { Outfit } from './state';

/**
 * One tick of the season: every open zone, shallowest first. Whatever the lab lets out makes the beach worse, and
 * the Source (when the player is it) makes all the water worse.
 */
export function tickOutfit(o: Outfit, dt: number): Outfit {
  const timed = { ...o, elapsed: o.elapsed + dt };
  const deep = 1 + o.deepPush;
  const wet = tickOpenWater(tickShelf(tickShallows(timed, dt, beachPressure(timed) * deep), dt, deep), dt, deep);
  return runFathomStory(tickBreach(tickTrench(wet, dt), dt));
}
