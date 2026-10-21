export interface EngineDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Thrust each unit adds: speed is thrust over the train's mass. */
  thrust: number;
}

/** Thrust, the haul's generators. Speed is total thrust over the train's mass, so every car slows the tug. */
export const ENGINES: readonly EngineDef[] = [
  {
    id: 'rcs',
    name: 'RCS QUAD',
    short: 'RCS',
    description: 'Four attitude thrusters, rated for docking. Rated is a strong word.',
    baseCost: 15,
    thrust: 0.1,
  },
  {
    id: 'booster',
    name: 'CHEMICAL BOOSTER',
    short: 'BOOSTER',
    description: 'A strap-on hydrolox stage. Cheap, loud and thirsty. The union calls them "the kettles".',
    baseCost: 250,
    thrust: 2,
  },
  {
    id: 'ion',
    name: 'ION DRIVE CLUSTER',
    short: 'ION',
    description: 'Twelve gridded thrusters on a common bus. Gentle, tireless, blue.',
    baseCost: 12_000,
    thrust: 30,
  },
  {
    id: 'torch',
    name: 'FUSION TORCH',
    short: 'TORCH',
    description: 'A magnetic bottle with the lid off. Point it away from the cars.',
    baseCost: 4_000_000,
    thrust: 500,
  },
  {
    id: 'twin',
    name: 'TWIN-BELL TORCH',
    short: 'TWIN',
    description: 'Two torches sharing one reactor. The reactor has opinions about this.',
    baseCost: 400_000_000,
    thrust: 8_000,
  },
  {
    id: 'pulse',
    name: 'PULSE DRIVE',
    short: 'PULSE',
    description: 'Fusion pellets lit behind a pusher plate, four a second. You feel every one in your teeth.',
    baseCost: 40_000_000_000,
    thrust: 130_000,
  },
  {
    id: 'lantern',
    name: 'LANTERN DRIVE',
    short: 'LANTERN',
    description: 'A Combine prototype, fitted at the last station by people who would not give their names.',
    baseCost: 4_000_000_000_000,
    thrust: 2_000_000,
  },
];

export interface CarDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Freight value per unit of distance hauled: what a delivery pays. */
  value: number;
  /** Dead weight the engines have to move. */
  mass: number;
}

/** Tow cars: freight value and mass. Better cars carry a little more value for their weight (1 rising to 2.5). */
export const CARS: readonly CarDef[] = [
  {
    id: 'hopper',
    name: 'ORE HOPPER',
    short: 'HOPPER',
    description: 'An open lattice basket of refined ore. Rattles.',
    baseCost: 25,
    value: 1,
    mass: 1,
  },
  {
    id: 'tanker',
    name: 'VOLATILES TANKER',
    short: 'TANKER',
    description: 'Pressurised deuterium and ammonia. The union rate for tanker duty is double.',
    baseCost: 600,
    value: 8,
    mass: 6,
  },
  {
    id: 'refinery',
    name: 'REFINERY CAR',
    short: 'REFINERY',
    description: 'A rolling smelter that works the ore on the way home. Pays for itself, the brochure says.',
    baseCost: 12_000,
    value: 56,
    mass: 35,
  },
  {
    id: 'cryo',
    name: 'CRYO HOLD',
    short: 'CRYO',
    description: 'Refrigerated freight: medical stock, seed banks, sealed Combine containers. Kept at 4 K.',
    baseCost: 300_000,
    value: 500,
    mass: 250,
  },
  {
    id: 'vault',
    name: 'BONDED VAULT CAR',
    short: 'VAULT',
    description: 'Armoured, insured, and logged at every station by a notary drone. Contents: classified.',
    baseCost: 9_000_000,
    value: 5_000,
    mass: 2_000,
  },
];

/** The tug itself: a small hold of its own, and the weight of the tug. */
export const TUG_VALUE = 0.5;
export const TUG_MASS = 1;

/** Stations on the route home, in order. The beacon is the detour the contract obliges the tug to answer. */
export const STATIONS: readonly string[] = [
  'KESTREL DEPOT',
  'ANVIL TRANSFER',
  'HALCYON FUEL DOCK',
  'MERIDIAN EXCHANGE',
  'TALLOW RING',
  'CINDER YARD',
  'ORISON CUSTOMS',
  'BARROW RELAY',
  'THE BEACON',
  'GANNET POINT',
  'SALT HARBOUR',
  'VESPER PORT',
  'LONG REACH',
  'HOLLIS GATE',
  'MARROW DEPOT',
  'LAST LIGHT TRANSFER',
];

/** The leg that ends at the beacon: answering it is what gives the story deep access. */
export const BEACON_LEG = STATIONS.indexOf('THE BEACON');

/** The station a leg ends at; past the named route, numbered relays. */
export const stationName = (leg: number): string => STATIONS[leg] ?? `RELAY ${leg - STATIONS.length + 1}`;
