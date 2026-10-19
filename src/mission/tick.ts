import { ORE_PRICE, oreRate, refineryCapacity } from './economy';
import type { MissionState } from './state';
import { tickCrew } from './crew';
import { tickDirectives } from './directives';
import { tickContainment } from './containment';
import { runBeats, type MissionContext } from './story';
import { STORY } from '../data/story';

const NO_HISTORY: MissionContext = { cycle: 0 };

export function tickMission(m: MissionState, dt: number, ctx: MissionContext = NO_HISTORY): MissionState {
  const mined = oreRate(m) * dt;
  const hopper = m.ore + mined;
  const refined = Math.min(hopper, refineryCapacity(m) * dt);
  const next = tickCrew({
    ...m,
    elapsed: m.elapsed + dt,
    ore: hopper - refined,
    lifetimeOre: m.lifetimeOre + mined,
    credits: m.credits + refined * ORE_PRICE,
    lifetimeCredits: m.lifetimeCredits + refined * ORE_PRICE,
  }, dt);
  return runBeats(tickDirectives(tickContainment(next, dt)), STORY, ctx);
}
