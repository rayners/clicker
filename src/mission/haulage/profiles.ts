import { BEACON_LEG, CARS, ENGINES, TUG_MASS, TUG_VALUE, stationName, type CarDef, type EngineDef } from '../../data/haulage/systems';
import { HAULAGE_UPGRADES, type HaulageEffect, type HaulageUpgradeDef } from '../../data/haulage/upgrades';
import { HAULAGE_CREW_BOOSTS } from '../../data/haulage/crew-boosts';
import type { MissionState } from '../state';

/** Everything that differs between hauls: what pulls, what is pulled, the route, and the money. The rules are shared. */
export interface HaulProfile {
  engines: readonly EngineDef[];
  cars: readonly CarDef[];
  upgrades: readonly HaulageUpgradeDef[];
  crewBoosts: Readonly<Record<string, { effect: HaulageEffect; text: string }>>;
  /** The tractor or tug itself: a small hold, and its own weight. */
  tugValue: number;
  tugMass: number;
  station(leg: number): string;
  /** The leg whose end gives the story deep access, if the route has one. */
  beaconLeg: number | null;
  legBase: number;
  legGrowth: number;
  windowBase: number;
  windowGrowth: number;
  /** Credits per unit of freight value per unit of distance. */
  pay: number;
  fuelPrice: number;
  /** Fuel per second per point of thrust at the nominal burn. */
  fuelPerThrust: number;
  /** Fit to the shared story scale (1,000 at act 2, 3,200 at the discovery). */
  progressScale: number;
  progressExponent: number;
}

/** The long haul: the tug Halvorsen Gale and a refinery train, station to station across the system. */
export const SPACE_HAUL: HaulProfile = {
  engines: ENGINES,
  cars: CARS,
  upgrades: HAULAGE_UPGRADES,
  crewBoosts: HAULAGE_CREW_BOOSTS,
  tugValue: TUG_VALUE,
  tugMass: TUG_MASS,
  station: stationName,
  beaconLeg: BEACON_LEG,
  legBase: 30,
  legGrowth: 1.6,
  windowBase: 60,
  windowGrowth: 1.3,
  pay: 0.6,
  fuelPrice: 0.6,
  fuelPerThrust: 0.45,
  // Freight revenue compounds faster than extraction's ore, so the curve is flatter (tuned by the pacing bot).
  progressScale: 3.82,
  progressExponent: 3.12,
};

const PROFILES: Readonly<Record<string, HaulProfile>> = { haulage: SPACE_HAUL };

export const profileOf = (m: MissionState): HaulProfile => PROFILES[m.scenario] ?? SPACE_HAUL;
