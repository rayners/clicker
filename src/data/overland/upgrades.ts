import type { HaulageUpgradeDef } from '../haulage/upgrades';
import { RIG_ENGINES, TRAILERS } from './systems';

/** Requisitions for the overland haul: fewer, and each teaches one lever of the long haul to come. */
const HANDCRAFTED: HaulageUpgradeDef[] = [
  {
    id: 'land-hand-throttle',
    name: 'HAND THROTTLE',
    description: 'A lever wired straight to the injectors. Each blip of the engine pushes x2.',
    cost: 40,
    unlock: { delivered: 30 },
    effect: { kind: 'thrusterMultiplier', value: 2 },
  },
  {
    id: 'land-governor',
    name: 'WARDEN THROTTLE GOVERNOR',
    description: 'WARDEN blips the engine on a timer. 1 a second, unattended.',
    cost: 100,
    unlock: { delivered: 60 },
    effect: { kind: 'autoThrusters', value: 1 },
  },
  {
    id: 'land-air-ride',
    name: 'AIR-RIDE SUSPENSION',
    description: 'Bags of air under every trailer. The rig takes one notch more throttle before the load starts to shake.',
    cost: 300,
    unlock: { delivered: 250 },
    effect: { kind: 'safeBurn', value: 1 },
  },
  {
    id: 'land-fuel-crews',
    name: 'DEPOT FUEL CREWS',
    description: 'Crews meet the rig at every depot and fill the tanks for the next leg.',
    cost: 800,
    unlock: { delivered: 600 },
    effect: { kind: 'droneLoaders', value: 1 },
  },
  {
    id: 'land-drive-assist',
    name: 'WARDEN DRIVE ASSIST',
    description: 'WARDEN holds the throttle that earns most: the window bonus, the fuel bill and the time all weighed. The long-haul autopilot, learned here first.',
    cost: 2_000,
    unlock: { delivered: 1_500 },
    effect: { kind: 'autopilot', value: 1 },
  },
  {
    id: 'land-route-maps',
    name: 'SURVEYED ROUTE MAPS',
    description: 'The dry washes and the soft sand are all on a map now. Every delivery window 25% longer.',
    cost: 4_000,
    unlock: { delivered: 3_000 },
    effect: { kind: 'windowMultiplier', value: 1.25 },
  },
  {
    id: 'land-lean-burn',
    name: 'LEAN-BURN TUNING',
    description: 'The injectors remapped by a mechanic who will not say where she learned it. Fuel per leg cut by a third.',
    cost: 8_000,
    unlock: { delivered: 6_000 },
    effect: { kind: 'fuelEfficiency', value: 1.5 },
  },
  {
    id: 'land-bonus-rates',
    name: 'LIFT PRIORITY RATES',
    description: 'Freight booked straight onto the elevator pays a premium. All freight pays x1.25.',
    cost: 20_000,
    unlock: { delivered: 15_000 },
    effect: { kind: 'payMultiplier', value: 1.25 },
  },
];

const TIERS = [{ suffix: 'MK II', count: 10, costFactor: 15, note: 'Rebuilt at a depot workshop.' }];

const ENGINE_TIERS: HaulageUpgradeDef[] = RIG_ENGINES.flatMap((e) =>
  TIERS.map((tier) => ({
    id: `land-${e.id}-${tier.count}`,
    name: `${e.name} ${tier.suffix}`,
    description: `${tier.note} ${e.name} pull x1.5.`,
    cost: e.baseCost * tier.costFactor,
    unlock: { engine: { id: e.id, count: tier.count } },
    effect: { kind: 'engineMultiplier', engine: e.id, value: 1.5 } as const,
  })),
);

const TRAILER_TIERS: HaulageUpgradeDef[] = TRAILERS.flatMap((c) =>
  TIERS.map((tier) => ({
    id: `land-${c.id}-${tier.count}`,
    name: `${c.name} ${tier.suffix}`,
    description: `${tier.note} ${c.name} freight value x1.5.`,
    cost: c.baseCost * tier.costFactor,
    unlock: { car: { id: c.id, count: tier.count } },
    effect: { kind: 'carMultiplier', car: c.id, value: 1.5 } as const,
  })),
);

export const OVERLAND_UPGRADES: readonly HaulageUpgradeDef[] = [...HANDCRAFTED, ...ENGINE_TIERS, ...TRAILER_TIERS];
