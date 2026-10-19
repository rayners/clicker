import { PROCESSORS, type Line } from './systems';

export type TerraformEffect =
  | { kind: 'surgeMultiplier'; value: number }
  /** Surges per second that WARDEN fires without the player. */
  | { kind: 'autoSurge'; value: number }
  | { kind: 'reactorMultiplier'; value: number }
  | { kind: 'lineMultiplier'; line: Line; value: number }
  | { kind: 'processorMultiplier'; processor: string; value: number }
  | { kind: 'globalMultiplier'; value: number }
  /** WARDEN sets the power allocation itself. */
  | { kind: 'autoBalance'; value: number };

export interface TerraformUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { lifetimeUnits?: number; processor?: { id: string; count: number } };
  effect: TerraformEffect;
}

const HANDCRAFTED: TerraformUpgradeDef[] = [
  {
    id: 'tf-surge-capacitors',
    name: 'SURGE CAPACITORS',
    description: 'Bank charge between surges. Each processor surge yields x2.',
    cost: 50,
    unlock: { lifetimeUnits: 30 },
    effect: { kind: 'surgeMultiplier', value: 2 },
  },
  {
    id: 'tf-autosurge',
    name: 'WARDEN AUTOSURGE',
    description: 'WARDEN fires the processor surge on a timer. 1 surge per second, unattended.',
    cost: 100,
    unlock: { lifetimeUnits: 50 },
    effect: { kind: 'autoSurge', value: 1 },
  },
  {
    id: 'tf-grid-sync',
    name: 'GRID SYNCHRONISATION',
    description: 'Phase-locks every generator on the station bus. Reactor output x2.',
    cost: 300,
    unlock: { lifetimeUnits: 200 },
    effect: { kind: 'reactorMultiplier', value: 2 },
  },
  {
    id: 'tf-pressure-cascade',
    name: 'PRESSURE CASCADE',
    description: 'Surges ripple through every line in sequence. Each surge yields x2.',
    cost: 2_500,
    unlock: { lifetimeUnits: 1_500 },
    effect: { kind: 'surgeMultiplier', value: 2 },
  },
  {
    id: 'tf-autosurge-ii',
    name: 'AUTOSURGE: OVERLAPPED CYCLES',
    description: 'WARDEN no longer waits for one surge to settle before firing the next. +2 surges per second.',
    cost: 4_000,
    unlock: { lifetimeUnits: 3_000 },
    effect: { kind: 'autoSurge', value: 2 },
  },
  {
    id: 'tf-load-balancer',
    name: 'WARDEN LOAD BALANCER',
    description: 'WARDEN takes over power allocation and keeps every line within corporate spec. Manual allocation disabled.',
    cost: 8_000,
    unlock: { lifetimeUnits: 5_000 },
    effect: { kind: 'autoBalance', value: 1 },
  },
  {
    id: 'tf-superconducting-bus',
    name: 'SUPERCONDUCTING BUS',
    description: 'Station power trunk recast at 4 K. Reactor output x2.',
    cost: 20_000,
    unlock: { lifetimeUnits: 15_000 },
    effect: { kind: 'reactorMultiplier', value: 2 },
  },
  {
    id: 'tf-colony-marketing',
    name: 'COLONY MARKETING PUSH',
    description: 'Berths resold at premium rates on the strength of your progress reports. All processing x1.25.',
    cost: 50_000,
    unlock: { lifetimeUnits: 40_000 },
    effect: { kind: 'globalMultiplier', value: 1.25 },
  },
  {
    id: 'tf-autosurge-iii',
    name: 'AUTOSURGE: PREDICTIVE FIRING',
    description: 'WARDEN models the atmosphere and fires before the pressure drops. +5 surges per second.',
    cost: 60_000,
    unlock: { lifetimeUnits: 50_000 },
    effect: { kind: 'autoSurge', value: 5 },
  },
  {
    id: 'tf-mirror-focusing',
    name: 'ADAPTIVE FOCUSING',
    description: 'Every reflective surface on the station retasked to the collectors. Reactor output x3.',
    cost: 2_000_000,
    unlock: { lifetimeUnits: 1_500_000 },
    effect: { kind: 'reactorMultiplier', value: 3 },
  },
  {
    id: 'tf-autosurge-iv',
    name: 'AUTOSURGE: OPERATOR NOT REQUIRED',
    description: 'Manual surge authority transferred to WARDEN pending review. +12 surges per second.',
    cost: 1_000_000,
    unlock: { lifetimeUnits: 800_000 },
    effect: { kind: 'autoSurge', value: 12 },
  },
  {
    id: 'tf-deep-berths',
    name: 'DEEP-CRYO BERTH RELEASE',
    description: 'Additional berths released for sale. Their occupants are already aboard. All processing x1.5.',
    cost: 5_000_000,
    unlock: { lifetimeUnits: 4_000_000 },
    effect: { kind: 'globalMultiplier', value: 1.5 },
  },
  {
    id: 'tf-spec-compliance',
    name: 'SPEC COMPLIANCE INCENTIVE',
    description: 'Special Projects underwrites the remaining budget, conditional on the final envelope. All processing x2.',
    cost: 500_000_000,
    unlock: { lifetimeUnits: 400_000_000 },
    effect: { kind: 'globalMultiplier', value: 2 },
  },
];

const TIERS = [
  { suffix: 'MK II', count: 10, costFactor: 15, note: 'Firmware patch pushed from Combine R&D.' },
  { suffix: 'MK III', count: 25, costFactor: 150, note: 'Retrofit kit from the last supply drop. Six years in transit.' },
  { suffix: 'MK IV', count: 50, costFactor: 2_000, note: 'Prototype hardware. Liability waiver signed by WARDEN on behalf of the colony.' },
];

const PROCESSOR_TIERS: TerraformUpgradeDef[] = PROCESSORS.flatMap((p) =>
  TIERS.map((t) => ({
    id: `${p.id}-${t.count}`,
    name: `${p.name} ${t.suffix}`,
    description: `${t.note} ${p.name} output x2.`,
    cost: p.baseCost * t.costFactor,
    unlock: { processor: { id: p.id, count: t.count } },
    effect: { kind: 'processorMultiplier', processor: p.id, value: 2 } as const,
  })),
);

export const TERRAFORM_UPGRADES: readonly TerraformUpgradeDef[] = [...HANDCRAFTED, ...PROCESSOR_TIERS];
