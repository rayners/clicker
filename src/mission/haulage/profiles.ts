import { BEACON_LEG, CARS, ENGINES, TUG_MASS, TUG_VALUE, stationName, type CarDef, type EngineDef } from '../../data/haulage/systems';
import { HAULAGE_UPGRADES, type HaulageEffect, type HaulageUpgradeDef } from '../../data/haulage/upgrades';
import { HAULAGE_CREW_BOOSTS } from '../../data/haulage/crew-boosts';
import { DEPOTS, RIG_ENGINES, RIG_MASS, RIG_VALUE, TRAILERS, depotName } from '../../data/overland/systems';
import { OVERLAND_UPGRADES } from '../../data/overland/upgrades';
import { OVERLAND_CREW_BOOSTS } from '../../data/overland/crew-boosts';
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

// Freight revenue compounds faster than extraction's ore, so the curve is flatter (tuned by the pacing bot).
const SPACE_HAUL_PROGRESS = { scale: 3.82, exponent: 3.12 };

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
  progressScale: SPACE_HAUL_PROGRESS.scale,
  progressExponent: SPACE_HAUL_PROGRESS.exponent,
};

/** The road to the lift: a crawler rig and its trailers, depot to depot. Shorter legs, gentler fuel, one act. */
export const LAND_HAUL: HaulProfile = {
  engines: RIG_ENGINES,
  cars: TRAILERS,
  upgrades: OVERLAND_UPGRADES,
  crewBoosts: OVERLAND_CREW_BOOSTS,
  tugValue: RIG_VALUE,
  tugMass: RIG_MASS,
  station: depotName,
  beaconLeg: null,
  legBase: 30,
  legGrowth: 1.8,
  windowBase: 60,
  windowGrowth: 1.4,
  pay: 0.72,
  fuelPrice: 0.32,
  fuelPerThrust: 0.3,
  // No horror rides the road, so nothing reads the story scale; kept on the long haul's curve for symmetry.
  progressScale: SPACE_HAUL_PROGRESS.scale,
  progressExponent: SPACE_HAUL_PROGRESS.exponent,
};

const PROFILES: Readonly<Record<string, HaulProfile>> = { haulage: SPACE_HAUL, overland: LAND_HAUL };

/** Depots on the road, for anything that needs the count. */
export const ROAD_DEPOTS = DEPOTS.length;

export const profileOf = (m: MissionState): HaulProfile => PROFILES[m.scenario] ?? SPACE_HAUL;
