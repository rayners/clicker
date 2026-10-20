import { TROOPERS } from './systems';

export type SecurityEffect =
  | { kind: 'supportMultiplier'; value: number }
  /** Fire-support calls per second that WARDEN makes without the player. */
  | { kind: 'autoSupport'; value: number }
  | { kind: 'fabricatorMultiplier'; value: number }
  | { kind: 'trooperMultiplier'; trooper: string; value: number }
  | { kind: 'forceMultiplier'; value: number }
  /** Multiplies the retainer the Combine pays for secured sectors. */
  | { kind: 'retainerMultiplier'; value: number }
  /** Each round goes further: ammunition demand divided by this. */
  | { kind: 'ammoEfficiency'; value: number }
  | { kind: 'sentryMultiplier'; value: number }
  /** WARDEN sets the assault/hold split itself. */
  | { kind: 'tacticalNet'; value: number };

export interface SecurityUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { recovered?: number; trooper?: { id: string; count: number }; sentries?: number };
  effect: SecurityEffect;
}

const HANDCRAFTED: SecurityUpgradeDef[] = [
  {
    id: 'sec-laser-designators',
    name: 'LASER DESIGNATORS',
    description: 'Troopers paint targets for WARDEN. Each fire-support call hits x2 as hard.',
    cost: 50,
    unlock: { recovered: 30 },
    effect: { kind: 'supportMultiplier', value: 2 },
  },
  {
    id: 'sec-auto-support',
    name: 'WARDEN FIRE CONTROL',
    description: 'WARDEN calls fire support on its own. 1 call per second, unattended.',
    cost: 100,
    unlock: { recovered: 50 },
    effect: { kind: 'autoSupport', value: 1 },
  },
  {
    id: 'sec-caseless-rounds',
    name: 'CASELESS ROUNDS',
    description: 'No brass to eject, no brass to print. Fabricator output x1.5.',
    cost: 300,
    unlock: { recovered: 200 },
    effect: { kind: 'fabricatorMultiplier', value: 1.5 },
  },
  {
    id: 'sec-fire-discipline',
    name: 'FIRE DISCIPLINE DRILLS',
    description: 'Short controlled bursts. The sergeant has been asked to stop shouting it. Ammunition demand halved.',
    cost: 2_500,
    unlock: { recovered: 1_500 },
    effect: { kind: 'ammoEfficiency', value: 2 },
  },
  {
    id: 'sec-auto-support-ii',
    name: 'FIRE CONTROL: RIPPLE FIRE',
    description: 'WARDEN walks fire across the frontier in overlapping strikes. +2 calls per second.',
    cost: 4_000,
    unlock: { recovered: 3_000 },
    effect: { kind: 'autoSupport', value: 2 },
  },
  {
    id: 'sec-tactical-net',
    name: 'WARDEN TACTICAL NET',
    description: 'WARDEN reads every helmet camera and splits the detachment itself: exactly enough on the line, everyone else forward.',
    cost: 3_000,
    unlock: { recovered: 2_000 },
    effect: { kind: 'tacticalNet', value: 1 },
  },
  {
    id: 'sec-printer-cooling',
    name: 'PRINTER COOLING LOOPS',
    description: 'Colony coolant plumbed through every fabricator. Fabricator output x1.5.',
    cost: 20_000,
    unlock: { recovered: 15_000 },
    effect: { kind: 'fabricatorMultiplier', value: 1.5 },
  },
  {
    id: 'sec-property-schedule',
    name: 'PROPERTY RECOVERY SCHEDULE',
    description: 'Every recovered asset itemised and billed to the colony\'s insurers. Retainer x1.25.',
    cost: 50_000,
    unlock: { recovered: 40_000 },
    effect: { kind: 'retainerMultiplier', value: 1.25 },
  },
  {
    id: 'sec-auto-support-iii',
    name: 'FIRE CONTROL: PREDICTIVE TARGETING',
    description: 'WARDEN fires where the contacts will be. +5 calls per second.',
    cost: 60_000,
    unlock: { recovered: 50_000 },
    effect: { kind: 'autoSupport', value: 5 },
  },
  {
    id: 'sec-combat-stims',
    name: 'COMBAT STIMULANTS',
    description: 'Issued by the medical officer under protest. All force x1.25.',
    cost: 400_000,
    unlock: { recovered: 300_000 },
    effect: { kind: 'forceMultiplier', value: 1.25 },
  },
  {
    id: 'sec-auto-support-iv',
    name: 'FIRE CONTROL: OPERATOR NOT REQUIRED',
    description: 'Fire-support authority transferred to WARDEN pending review. +12 calls per second.',
    cost: 1_000_000,
    unlock: { recovered: 800_000 },
    effect: { kind: 'autoSupport', value: 12 },
  },
  {
    id: 'sec-foundry-overclock',
    name: 'FOUNDRY OVERCLOCK',
    description: 'Safety interlocks on every fabricator disabled by WARDEN. Fabricator output x2.',
    cost: 2_000_000,
    unlock: { recovered: 1_500_000 },
    effect: { kind: 'fabricatorMultiplier', value: 2 },
  },
  {
    id: 'sec-asset-reclassification',
    name: 'ASSET RECLASSIFICATION',
    description: 'The colony is re-rated from "residential" to "strategic". The Combine\'s rates go up accordingly. Retainer x1.5.',
    cost: 5_000_000,
    unlock: { recovered: 4_000_000 },
    effect: { kind: 'retainerMultiplier', value: 1.5 },
  },
  {
    id: 'sec-special-projects-rider',
    name: 'SPECIAL PROJECTS RIDER',
    description: 'A rider to the contract underwrites everything below the processor. Do not ask the colonists about it. Retainer x2.',
    cost: 500_000_000,
    unlock: { recovered: 400_000_000 },
    effect: { kind: 'retainerMultiplier', value: 2 },
  },
];

const TIERS = [
  { suffix: 'MK II', count: 10, costFactor: 15, note: 'Kit upgrade from the transport\'s stores.' },
  { suffix: 'MK III', count: 25, costFactor: 150, note: 'Field modifications, logged after the fact.' },
  { suffix: 'MK IV', count: 50, costFactor: 2_000, note: 'Prototype equipment. Liability waiver signed by WARDEN on behalf of the detachment.' },
];

const TROOPER_TIERS: SecurityUpgradeDef[] = TROOPERS.flatMap((t) =>
  TIERS.map((tier) => ({
    id: `${t.id}-${tier.count}`,
    name: `${t.name} ${tier.suffix}`,
    description: `${tier.note} ${t.name} force x2.`,
    cost: t.baseCost * tier.costFactor,
    unlock: { trooper: { id: t.id, count: tier.count } },
    effect: { kind: 'trooperMultiplier', trooper: t.id, value: 2 } as const,
  })),
);

/** Sentry guns hold more with each generation; the colony's corridors get no wider. */
const SENTRY_TIERS: SecurityUpgradeDef[] = [
  { count: 5, cost: 20_000, value: 5, name: 'SENTRY GUNS: MOTION TRACKING', note: 'Guns track movement instead of waiting for it.' },
  { count: 15, cost: 2_000_000, value: 10, name: 'SENTRY GUNS: LINKED FIELDS OF FIRE', note: 'Every gun in a sector covers every other.' },
  { count: 30, cost: 300_000_000, value: 10, name: 'SENTRY GUNS: SPECIAL PROJECTS PATTERN', note: 'Hardware of unknown origin, issued without a manual.' },
].map((t) => ({
  id: `sentry-${t.count}`,
  name: t.name,
  description: `${t.note} Sentry holding force x${t.value}.`,
  cost: t.cost,
  unlock: { sentries: t.count },
  effect: { kind: 'sentryMultiplier', value: t.value } as const,
}));

export const SECURITY_UPGRADES: readonly SecurityUpgradeDef[] = [...HANDCRAFTED, ...TROOPER_TIERS, ...SENTRY_TIERS];
