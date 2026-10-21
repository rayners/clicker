import type { CarDef, EngineDef } from '../haulage/systems';

/** Powertrains for the crawler rig: the overland haul's generators. */
export const RIG_ENGINES: readonly EngineDef[] = [
  {
    id: 'bogie',
    name: 'DIESEL BOGIE',
    short: 'BOGIE',
    description: 'A second-hand drive bogie off a mine truck. It starts on the third try. Usually.',
    baseCost: 15,
    thrust: 0.1,
  },
  {
    id: 'turbo',
    name: 'TURBO-DIESEL PACK',
    short: 'TURBO',
    description: 'Twin turbochargers and a fan belt the size of a hula hoop. Drinks like a sailor.',
    baseCost: 400,
    thrust: 2,
  },
  {
    id: 'fuelcell',
    name: 'FUEL-CELL STACK',
    short: 'CELLS',
    description: 'Hydrogen in, water and torque out. The exhaust is the only drinkable water for forty kilometres.',
    baseCost: 15_000,
    thrust: 30,
  },
  {
    id: 'reactor',
    name: 'COMPACT REACTOR',
    short: 'REACTOR',
    description: 'A sealed pebble-bed unit on a sled. The dosimeter on the dash has been taped over.',
    baseCost: 600_000,
    thrust: 500,
  },
];

/** Trailers: freight value and dead weight, hitched behind the rig. */
export const TRAILERS: readonly CarDef[] = [
  {
    id: 'skip',
    name: 'ORE SKIP',
    short: 'SKIP',
    description: 'An open steel bin of crushed ore. Leaves a trail of it the whole way.',
    baseCost: 25,
    value: 1,
    mass: 1,
  },
  {
    id: 'slurry',
    name: 'SLURRY TANKER',
    short: 'SLURRY',
    description: 'Ore ground to mud and pumped into a drum. Do not stop on a slope.',
    baseCost: 500,
    value: 8,
    mass: 6,
  },
  {
    id: 'flatbed',
    name: 'CONTAINER FLATBED',
    short: 'FLATBED',
    description: 'Sealed Combine containers, bound for the lift. The seals are inspected at every depot. By whom is not clear.',
    baseCost: 8_000,
    value: 56,
    mass: 35,
  },
];

/** The rig itself: a small bed of its own, and its own weight. */
export const RIG_VALUE = 0.5;
export const RIG_MASS = 1;

/** Depots on the road from the mine to the space elevator. Reaching the last ends the contract. */
export const DEPOTS: readonly string[] = [
  'PIT 4 LOADOUT',
  'CAUSEWAY DEPOT',
  'SALT FLATS WATER STOP',
  'RIDGE PUMPING STATION',
  'DUSTWATER',
  'GANTRY JUNCTION',
  'COLDBROOK',
  'MESA SWITCHYARD',
  'OUTER MARKER',
  'PORT KESSLER LIFT',
];

/** Legs to the lift: arriving at the last depot opens the terminus. */
export const ROAD_LEGS = DEPOTS.length;

export const depotName = (leg: number): string => DEPOTS[leg] ?? `WAYPOINT ${leg - DEPOTS.length + 1}`;
