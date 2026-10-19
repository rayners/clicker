import { ORE_PRICE, oreRate, refineryCapacity } from './economy';
import type { MissionState } from './state';
import { tickCrew } from './crew';

export function tickMission(m: MissionState, dt: number): MissionState {
  const mined = oreRate(m) * dt;
  const hopper = m.ore + mined;
  const refined = Math.min(hopper, refineryCapacity(m) * dt);
  return tickCrew({
    ...m,
    elapsed: m.elapsed + dt,
    ore: hopper - refined,
    lifetimeOre: m.lifetimeOre + mined,
    credits: m.credits + refined * ORE_PRICE,
  }, dt);
}
