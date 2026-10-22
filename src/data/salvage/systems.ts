import type { SectionDef } from '../../shared/ground';

export interface CutterDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Cutting force each unit brings to the frontier compartment. */
  force: number;
}

/** Cutting tiers, salvage's generators. All of them cut at the frontier; nothing is held back. */
export const CUTTERS: readonly CutterDef[] = [
  {
    id: 'welders',
    name: 'TORCH WELDER',
    short: 'WELDER',
    description: 'One salvage hand, one oxy-acetylene torch, one share on the schedule. Hums while working.',
    baseCost: 15,
    force: 0.1,
  },
  {
    id: 'crew',
    name: 'CUTTING CREW',
    short: 'CREW',
    description: 'Three hands with plasma cutters and a foreman who has opened forty hulls and says so.',
    baseCost: 400,
    force: 2,
  },
  {
    id: 'rig',
    name: 'CUTTING RIG',
    short: 'RIG',
    description: 'A tracked frame of saws that clamps to a bulkhead and walks through it.',
    baseCost: 12_000,
    force: 40,
  },
  {
    id: 'drones',
    name: 'DEMOLITION DRONE SWARM',
    short: 'DRONES',
    description: 'Forty fist-sized cutters that share one mind and argue with WARDEN about the cut lines.',
    baseCost: 500_000,
    force: 1_100,
  },
  {
    id: 'lance',
    name: 'PLASMA LANCE',
    short: 'LANCE',
    description: 'The tug\'s own spinal cutter, run through the derelict\'s ribs. Reaches three decks at a time.',
    baseCost: 25_000_000,
    force: 35_000,
  },
  {
    id: 'breaker',
    name: 'COMBINE BREAKER SHIP',
    short: 'BREAKER',
    description: 'A yard ship that eats hulls. It was not due in this system for another nine years.',
    baseCost: 1_200_000_000,
    force: 1_100_000,
  },
];

export interface ShoringDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Structural load each unit carries. */
  hold: number;
}

/** Shoring, the brake: dearer faster than cutters, and every opened compartment needs it. */
export const SHORING: readonly ShoringDef[] = [
  {
    id: 'frames',
    name: 'BRACING FRAME',
    short: 'FRAMES',
    description: 'Telescoping steel props, wedged deck to deckhead. Rated for thirty years ago.',
    baseCost: 30,
    hold: 0.15,
  },
  {
    id: 'jacks',
    name: 'HYDRAULIC JACKS',
    short: 'JACKS',
    description: 'Hold a buckling bulkhead apart with forty tonnes and a reassuring hiss.',
    baseCost: 800,
    hold: 3,
  },
  {
    id: 'foam',
    name: 'STRUCTURAL FOAM',
    short: 'FOAM',
    description: 'Sprayed into the voids, sets like bone in ninety seconds. Smells faintly of oranges.',
    baseCost: 25_000,
    hold: 60,
  },
  {
    id: 'truss',
    name: 'SPINE TRUSS',
    short: 'TRUSS',
    description: 'A second keel threaded through the derelict from bow to stern. She is ours now.',
    baseCost: 1_000_000,
    hold: 1_600,
  },
  {
    id: 'clamps',
    name: 'HULL CLAMP CRADLE',
    short: 'CLAMPS',
    description: 'The tug\'s docking cradle, rebuilt around the whole wreck. It holds her very tightly.',
    baseCost: 60_000_000,
    hold: 50_000,
  },
];

export interface Compartment extends SectionDef {
  /** Past the sealed hold: opening it gives the story deep access. */
  deep?: boolean;
}

/** Load triples aft, so the cutting has to grow by orders of magnitude to reach the drive core. */
const LOAD_GROWTH = 3;
const NAMES: { id: string; name: string; deep?: boolean }[] = [
  { id: 'airlock', name: 'BOW AIRLOCK' },
  { id: 'bridge', name: 'BRIDGE' },
  { id: 'quarters', name: 'CREW QUARTERS' },
  { id: 'galley', name: 'GALLEY' },
  { id: 'medbay', name: 'MED BAY' },
  { id: 'cryo1', name: 'CRYO BAY A' },
  { id: 'cryo2', name: 'CRYO BAY B' },
  { id: 'cryo3', name: 'CRYO BAY C' },
  { id: 'shop', name: 'MACHINE SHOP' },
  { id: 'hold', name: 'CARGO HOLD: SEALED', deep: true },
  { id: 'lower', name: 'CARGO HOLD: LOWER DECK', deep: true },
  { id: 'keel', name: 'KEEL CORRIDOR', deep: true },
  { id: 'shielding', name: 'REACTOR SHIELDING', deep: true },
  { id: 'core', name: 'THE DRIVE CORE', deep: true },
];

export const COMPARTMENTS: readonly Compartment[] = NAMES.map((n, i) => ({
  ...n,
  threat: LOAD_GROWTH ** i,
  // Forward compartments sag slowly when unbraced; aft of the hold they fold almost at once.
  reclaim: n.deep ? 0.01 : 0.003,
}));

/** Credits per second per point of an open compartment's load, as it is stripped. */
export const STRIP_PER_LOAD = 0.75;
/** Salvage cut free on the way into a compartment the first time, in seconds of its strip rate. */
export const SALVAGE_SECONDS = 60;
