import { GENERATORS } from './generators';

export type UpgradeEffect =
  | { kind: 'clickMultiplier'; value: number }
  | { kind: 'clickRateShare'; value: number }
  /** Drill cycles per second that WARDEN fires without the player. */
  | { kind: 'autoDrill'; value: number }
  | { kind: 'generatorMultiplier'; generator: string; value: number }
  | { kind: 'globalMultiplier'; value: number }
  | { kind: 'refineryMultiplier'; value: number };

export interface UpgradeUnlock {
  lifetimeOre?: number;
  generator?: { id: string; count: number };
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: UpgradeUnlock;
  effect: UpgradeEffect;
}

const HANDCRAFTED: UpgradeDef[] = [
  {
    id: 'tungsten-bits',
    name: 'TUNGSTEN-CARBIDE BITS',
    description: 'Standard issue. Should have been fitted at departure. Drill cycles yield x2.',
    cost: 50,
    unlock: { lifetimeOre: 30 },
    effect: { kind: 'clickMultiplier', value: 2 },
  },
  {
    id: 'warden-autocycle',
    name: 'WARDEN AUTOCYCLE',
    description: 'WARDEN takes the drill controls between shifts. Fires 1 drill cycle per second, unattended.',
    cost: 100,
    unlock: { lifetimeOre: 50 },
    effect: { kind: 'autoDrill', value: 1 },
  },
  {
    id: 'catalytic-cracking',
    name: 'CATALYTIC CRACKING',
    description: 'Refinery catalyst bed brought online. Throughput x2.',
    cost: 300,
    unlock: { lifetimeOre: 200 },
    effect: { kind: 'refineryMultiplier', value: 2 },
  },
  {
    id: 'pneumatic-hammer',
    name: 'PNEUMATIC HAMMER ASSEMBLY',
    description: 'Percussive assist on the primary drill head. Drill cycles yield x2.',
    cost: 2_500,
    unlock: { lifetimeOre: 1_500 },
    effect: { kind: 'clickMultiplier', value: 2 },
  },
  {
    id: 'autocycle-ii',
    name: 'AUTOCYCLE: PARALLEL SCHEDULER',
    description: 'WARDEN interleaves drill cycles with housekeeping tasks. +2 automatic cycles per second.',
    cost: 4_000,
    unlock: { lifetimeOre: 3_000 },
    effect: { kind: 'autoDrill', value: 2 },
  },
  {
    id: 'telemetry-assist',
    name: 'TELEMETRY ASSIST',
    description: 'WARDEN routes rig telemetry into each manual cycle. Adds 5% of automated output per cycle.',
    cost: 5_000,
    unlock: { generator: { id: 'auger', count: 5 } },
    effect: { kind: 'clickRateShare', value: 0.05 },
  },
  {
    id: 'centrifugal-separators',
    name: 'CENTRIFUGAL SEPARATORS',
    description: 'Spin-grade the slurry before smelting. Throughput x2.',
    cost: 20_000,
    unlock: { lifetimeOre: 15_000 },
    effect: { kind: 'refineryMultiplier', value: 2 },
  },
  {
    id: 'shift-incentive',
    name: 'SHIFT INCENTIVE SCHEME',
    description: 'Combine HR approves a productivity bonus. Crew are not informed of the clawback clause. All output x1.25.',
    cost: 50_000,
    unlock: { lifetimeOre: 40_000 },
    effect: { kind: 'globalMultiplier', value: 1.25 },
  },
  {
    id: 'autocycle-iii',
    name: 'AUTOCYCLE: PREDICTIVE STRIKE',
    description: 'WARDEN models the rock face and fires before the operator would. +5 automatic cycles per second.',
    cost: 60_000,
    unlock: { lifetimeOre: 50_000 },
    effect: { kind: 'autoDrill', value: 5 },
  },
  {
    id: 'diamond-crown',
    name: 'DIAMOND CROWN BITS',
    description: 'Synthetic diamond drill crowns. Drill cycles yield x3.',
    cost: 150_000,
    unlock: { lifetimeOre: 100_000 },
    effect: { kind: 'clickMultiplier', value: 3 },
  },
  {
    id: 'zero-g-smelting',
    name: 'ZERO-G SMELTING',
    description: 'Float-zone smelters in the aft hold. Throughput x3.',
    cost: 2_000_000,
    unlock: { lifetimeOre: 1_500_000 },
    effect: { kind: 'refineryMultiplier', value: 3 },
  },
  {
    id: 'autocycle-iv',
    name: 'AUTOCYCLE: OPERATOR NOT REQUIRED',
    description: 'Manual drill authority transferred to WARDEN pending review. +12 automatic cycles per second.',
    cost: 1_000_000,
    unlock: { lifetimeOre: 800_000 },
    effect: { kind: 'autoDrill', value: 12 },
  },
  {
    id: 'productivity-audit',
    name: 'PRODUCTIVITY AUDIT',
    description: 'Remote audit from Combine HQ. Results: satisfactory. All output x1.5.',
    cost: 5_000_000,
    unlock: { lifetimeOre: 4_000_000 },
    effect: { kind: 'globalMultiplier', value: 1.5 },
  },
  {
    id: 'quota-ascension',
    name: 'QUOTA ASCENSION PROTOCOL',
    description: 'Safety interlocks reclassified as advisory. All output x2.',
    cost: 500_000_000,
    unlock: { lifetimeOre: 400_000_000 },
    effect: { kind: 'globalMultiplier', value: 2 },
  },
];

const TIERS = [
  { suffix: 'MK II', count: 10, costFactor: 15, note: 'Firmware patch pushed from Combine R&D.' },
  { suffix: 'MK III', count: 25, costFactor: 150, note: 'Retrofit kit from the last resupply drop. Fourteen months in transit.' },
  { suffix: 'MK IV', count: 50, costFactor: 2_000, note: 'Prototype hardware. Liability waiver signed by WARDEN on behalf of the crew.' },
];

const GENERATOR_TIERS: UpgradeDef[] = GENERATORS.flatMap((g) =>
  TIERS.map((t) => ({
    id: `${g.id}-${t.count}`,
    name: `${g.name} ${t.suffix}`,
    description: `${t.note} ${g.name} output x2.`,
    cost: g.baseCost * t.costFactor,
    unlock: { generator: { id: g.id, count: t.count } },
    effect: { kind: 'generatorMultiplier', generator: g.id, value: 2 } as const,
  })),
);

export const UPGRADES: readonly UpgradeDef[] = [...HANDCRAFTED, ...GENERATOR_TIERS];
