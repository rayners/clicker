import { CARS, ENGINES } from './systems';

export type HaulageEffect =
  /** Each manual thruster burst pushes the train this many times further. */
  | { kind: 'thrusterMultiplier'; value: number }
  /** Thruster bursts per second that WARDEN fires without the player. */
  | { kind: 'autoThrusters'; value: number }
  | { kind: 'thrustMultiplier'; value: number }
  | { kind: 'engineMultiplier'; engine: string; value: number }
  | { kind: 'carMultiplier'; car: string; value: number }
  /** Multiplies what every delivery pays. */
  | { kind: 'payMultiplier'; value: number }
  /** Fuel burned divided by this. */
  | { kind: 'fuelEfficiency'; value: number }
  /** Raises the burn the cars take without strain. */
  | { kind: 'safeBurn'; value: number }
  /** WARDEN sets the burn: just fast enough for the window, never past the strain line. */
  | { kind: 'autopilot'; value: number }
  /** Station drones refuel the tug for the next leg without being asked. */
  | { kind: 'droneLoaders'; value: number }
  /** Delivery windows this many times longer: the route is planned, not guessed. */
  | { kind: 'windowMultiplier'; value: number };

export interface HaulageUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { delivered?: number; engine?: { id: string; count: number }; car?: { id: string; count: number } };
  effect: HaulageEffect;
}

const HANDCRAFTED: HaulageUpgradeDef[] = [
  {
    id: 'haul-gimbal',
    name: 'GIMBALLED NOZZLES',
    description: 'The manoeuvring thrusters swivel to push straight down the line. Each burst pushes x2.',
    cost: 40,
    unlock: { delivered: 30 },
    effect: { kind: 'thrusterMultiplier', value: 2 },
  },
  {
    id: 'haul-pulse-timer',
    name: 'WARDEN PULSE TIMER',
    description: 'WARDEN fires the manoeuvring thrusters on a timer. 1 burst per second, unattended.',
    cost: 100,
    unlock: { delivered: 60 },
    effect: { kind: 'autoThrusters', value: 1 },
  },
  {
    id: 'haul-shock-mounts',
    name: 'SHOCK MOUNTS',
    description: 'Sprung couplings between every car. The train takes one notch more burn without strain.',
    cost: 300,
    unlock: { delivered: 250 },
    effect: { kind: 'safeBurn', value: 1 },
  },
  {
    id: 'haul-drone-loaders',
    name: 'STATION DRONE LOADERS',
    description: 'Contract drones meet the tug at every dock and fill the tanks for the next leg. Billed to the tug, naturally.',
    cost: 800,
    unlock: { delivered: 600 },
    effect: { kind: 'droneLoaders', value: 1 },
  },
  {
    id: 'haul-autopilot',
    name: 'WARDEN AUTOPILOT',
    description: 'WARDEN holds the burn: just hot enough to make the window, never past the strain line.',
    cost: 2_500,
    unlock: { delivered: 2_000 },
    effect: { kind: 'autopilot', value: 1 },
  },
  {
    id: 'haul-preheaters',
    name: 'PROPELLANT PREHEATERS',
    description: 'Waste heat from the reactor warms the fuel before it burns. Fuel burned per leg cut by a third.',
    cost: 4_000,
    unlock: { delivered: 3_000 },
    effect: { kind: 'fuelEfficiency', value: 1.5 },
  },
  {
    id: 'haul-pulse-timer-ii',
    name: 'PULSE TIMER: CONTINUOUS',
    description: 'The thrusters never stop. Neither does the noise. +4 bursts per second.',
    cost: 6_000,
    unlock: { delivered: 5_000 },
    effect: { kind: 'autoThrusters', value: 4 },
  },
  {
    id: 'haul-nav-computer',
    name: 'NAVIGATION COMPUTER',
    description: 'The route is planned three stations ahead. Every delivery window 25% longer.',
    cost: 15_000,
    unlock: { delivered: 12_000 },
    effect: { kind: 'windowMultiplier', value: 1.25 },
  },
  {
    id: 'haul-share-schedule',
    name: 'REVISED SHARE SCHEDULE',
    description: 'The crew\'s shares renegotiated "in light of the current market". Every delivery pays x1.25 to the Combine.',
    cost: 40_000,
    unlock: { delivered: 30_000 },
    effect: { kind: 'payMultiplier', value: 1.25 },
  },
  {
    id: 'haul-truss-bracing',
    name: 'TRUSS BRACING',
    description: 'Carbon struts welded along the whole train. One more notch of burn without strain.',
    cost: 120_000,
    unlock: { delivered: 100_000 },
    effect: { kind: 'safeBurn', value: 1 },
  },
  {
    id: 'haul-magnetic-nozzles',
    name: 'MAGNETIC NOZZLES',
    description: 'Exhaust shaped by field coils instead of metal. All thrust x1.5.',
    cost: 500_000,
    unlock: { delivered: 400_000 },
    effect: { kind: 'thrustMultiplier', value: 1.5 },
  },
  {
    id: 'haul-closed-cycle',
    name: 'CLOSED-CYCLE REACTION MASS',
    description: 'Reaction mass recovered and reburned. Fuel burned per leg halved.',
    cost: 3_000_000,
    unlock: { delivered: 2_500_000 },
    effect: { kind: 'fuelEfficiency', value: 2 },
  },
  {
    id: 'haul-priority-freight',
    name: 'PRIORITY FREIGHT CLASS',
    description: 'The Combine reclassifies the whole train as priority freight. Nobody asks what changed. Every delivery pays x1.5.',
    cost: 8_000_000,
    unlock: { delivered: 6_000_000 },
    effect: { kind: 'payMultiplier', value: 1.5 },
  },
  {
    id: 'haul-special-handling',
    name: 'SPECIAL HANDLING RIDER',
    description: 'A rider to the contract covers one sealed container, value undeclared. Every delivery pays x2.',
    cost: 600_000_000,
    unlock: { delivered: 500_000_000 },
    effect: { kind: 'payMultiplier', value: 2 },
  },
];

const TIERS = [
  { suffix: 'MK II', count: 10, costFactor: 15, note: 'Refit at a station yard.' },
  { suffix: 'MK III', count: 25, costFactor: 150, note: 'Field modifications, logged after the fact.' },
  { suffix: 'MK IV', count: 50, costFactor: 2_000, note: 'Prototype parts. Warranty void past the next station.' },
];

const ENGINE_TIERS: HaulageUpgradeDef[] = ENGINES.flatMap((e) =>
  TIERS.map((tier) => ({
    id: `${e.id}-${tier.count}`,
    name: `${e.name} ${tier.suffix}`,
    description: `${tier.note} ${e.name} thrust x2.`,
    cost: e.baseCost * tier.costFactor,
    unlock: { engine: { id: e.id, count: tier.count } },
    effect: { kind: 'engineMultiplier', engine: e.id, value: 2 } as const,
  })),
);

const CAR_TIERS: HaulageUpgradeDef[] = CARS.flatMap((c) =>
  TIERS.map((tier) => ({
    id: `${c.id}-${tier.count}`,
    name: `${c.name} ${tier.suffix}`,
    description: `${tier.note} ${c.name} freight value x2.`,
    cost: c.baseCost * tier.costFactor,
    unlock: { car: { id: c.id, count: tier.count } },
    effect: { kind: 'carMultiplier', car: c.id, value: 2 } as const,
  })),
);

export const HAULAGE_UPGRADES: readonly HaulageUpgradeDef[] = [...HANDCRAFTED, ...ENGINE_TIERS, ...CAR_TIERS];
