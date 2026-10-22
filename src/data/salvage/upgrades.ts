import { CUTTERS } from './systems';

export type SalvageEffect =
  /** Multiplies each manual cut. */
  | { kind: 'cutPower'; value: number }
  /** Cuts per second WARDEN makes without the player. */
  | { kind: 'autoCut'; value: number }
  | { kind: 'cutterMultiplier'; cutter: string; value: number }
  | { kind: 'cutMultiplier'; value: number }
  | { kind: 'shoringMultiplier'; value: number }
  /** Multiplies all salvage paid. */
  | { kind: 'stripMultiplier'; value: number }
  /** Raises the torch notch the hull takes without stress. */
  | { kind: 'safeLine'; value: number }
  /** WARDEN runs the torch dial itself, as hot as the stress allows. */
  | { kind: 'governor'; value: number };

export interface SalvageUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { recovered?: number; cutter?: { id: string; count: number } };
  effect: SalvageEffect;
}

const HANDCRAFTED: SalvageUpgradeDef[] = [
  {
    id: 'sal-thermic-lances',
    name: 'THERMIC LANCES',
    description: 'Burning-bar cutters for WARDEN\'s own arm. Each manual cut x2.',
    cost: 50,
    unlock: { recovered: 30 },
    effect: { kind: 'cutPower', value: 2 },
  },
  {
    id: 'sal-auto-cut',
    name: 'WARDEN CUTTING PULSE',
    description: 'WARDEN fires the tug\'s cutting arm on its own. 1 cut per second, unattended.',
    cost: 100,
    unlock: { recovered: 50 },
    effect: { kind: 'autoCut', value: 1 },
  },
  {
    id: 'sal-strain-gauges',
    name: 'STRAIN GAUGES',
    description: 'Sensors glued along every frame. The hull takes one notch more torch before it complains.',
    cost: 300,
    unlock: { recovered: 200 },
    effect: { kind: 'safeLine', value: 1 },
  },
  {
    id: 'sal-shoring-drill',
    name: 'SHORING DRILL',
    description: 'The foreman times every crew putting up a frame. Shoring holds x1.5.',
    cost: 600,
    unlock: { recovered: 400 },
    effect: { kind: 'shoringMultiplier', value: 1.5 },
  },
  {
    id: 'sal-salvage-schedule',
    name: 'SALVAGE SCHEDULE',
    description: 'Every fitting listed, photographed and priced before it leaves the hull. Salvage x1.25.',
    cost: 2_500,
    unlock: { recovered: 1_500 },
    effect: { kind: 'stripMultiplier', value: 1.25 },
  },
  {
    id: 'sal-governor',
    name: 'WARDEN HULL GOVERNOR',
    description: 'WARDEN reads the strain gauges and rides the torch as hot as the hull allows, backing off before a breach.',
    cost: 3_000,
    unlock: { recovered: 2_000 },
    effect: { kind: 'governor', value: 1 },
  },
  {
    id: 'sal-auto-cut-ii',
    name: 'CUTTING PULSE: STAGGERED ARMS',
    description: 'Both of the tug\'s arms cut in turn. +2 cuts per second.',
    cost: 4_000,
    unlock: { recovered: 3_000 },
    effect: { kind: 'autoCut', value: 2 },
  },
  {
    id: 'sal-stress-mapping',
    name: 'STRESS MAPPING',
    description: 'WARDEN models the whole hull. The torch runs one notch hotter before stress builds.',
    cost: 20_000,
    unlock: { recovered: 15_000 },
    effect: { kind: 'safeLine', value: 1 },
  },
  {
    id: 'sal-stripping-drones',
    name: 'STRIPPING DRONES',
    description: 'Little machines that unbolt anything worth unbolting. Salvage x1.5.',
    cost: 50_000,
    unlock: { recovered: 40_000 },
    effect: { kind: 'stripMultiplier', value: 1.5 },
  },
  {
    id: 'sal-auto-cut-iii',
    name: 'CUTTING PULSE: PREDICTIVE LINES',
    description: 'WARDEN cuts where the frames are weakest before anyone looks. +5 cuts per second.',
    cost: 60_000,
    unlock: { recovered: 50_000 },
    effect: { kind: 'autoCut', value: 5 },
  },
  {
    id: 'sal-foam-curing',
    name: 'FAST-CURE FOAM',
    description: 'Sets in nine seconds instead of ninety. Shoring holds x2.',
    cost: 400_000,
    unlock: { recovered: 300_000 },
    effect: { kind: 'shoringMultiplier', value: 2 },
  },
  {
    id: 'sal-shift-bonuses',
    name: 'SHIFT BONUSES',
    description: 'Double shares for every compartment opened ahead of schedule. All cutting x1.25.',
    cost: 600_000,
    unlock: { recovered: 500_000 },
    effect: { kind: 'cutMultiplier', value: 1.25 },
  },
  {
    id: 'sal-auto-cut-iv',
    name: 'CUTTING PULSE: OPERATOR NOT REQUIRED',
    description: 'Cutting authority transferred to WARDEN pending review. +12 cuts per second.',
    cost: 1_000_000,
    unlock: { recovered: 800_000 },
    effect: { kind: 'autoCut', value: 12 },
  },
  {
    id: 'sal-hull-annealing',
    name: 'HULL ANNEALING',
    description: 'The derelict\'s frames are heated and relaxed ahead of the torch. One more safe notch.',
    cost: 2_000_000,
    unlock: { recovered: 1_500_000 },
    effect: { kind: 'safeLine', value: 1 },
  },
  {
    id: 'sal-rights-dispute',
    name: 'SALVAGE RIGHTS RULING',
    description: 'The court finds for the Combine. The insurers\' share reverts to the company. Salvage x1.5.',
    cost: 5_000_000,
    unlock: { recovered: 4_000_000 },
    effect: { kind: 'stripMultiplier', value: 1.5 },
  },
  {
    id: 'sal-special-projects-rider',
    name: 'SPECIAL PROJECTS RIDER',
    description: 'A rider to the claim underwrites the cargo hold\'s contents at any price. Salvage x2.',
    cost: 500_000_000,
    unlock: { recovered: 400_000_000 },
    effect: { kind: 'stripMultiplier', value: 2 },
  },
];

const TIERS = [
  { suffix: 'MK II', count: 10, costFactor: 15, note: 'Fresh tips from the tug\'s stores.' },
  { suffix: 'MK III', count: 25, costFactor: 150, note: 'Field modifications, logged after the fact.' },
  { suffix: 'MK IV', count: 50, costFactor: 2_000, note: 'Yard prototypes. Liability waiver signed by WARDEN on behalf of the crew.' },
];

const CUTTER_TIERS: SalvageUpgradeDef[] = CUTTERS.flatMap((c) =>
  TIERS.map((tier) => ({
    id: `${c.id}-${tier.count}`,
    name: `${c.name} ${tier.suffix}`,
    description: `${tier.note} ${c.name} cutting x2.`,
    cost: c.baseCost * tier.costFactor,
    unlock: { cutter: { id: c.id, count: tier.count } },
    effect: { kind: 'cutterMultiplier', cutter: c.id, value: 2 } as const,
  })),
);

export const SALVAGE_UPGRADES: readonly SalvageUpgradeDef[] = [...HANDCRAFTED, ...CUTTER_TIERS];
