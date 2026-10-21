import { POLICIES } from './insurer';

export type InsurerEffect =
  | { kind: 'saleMultiplier'; value: number }
  /** Policies sold per second by the telesales floor without the claims manager. */
  | { kind: 'autoSale'; value: number }
  | { kind: 'policyMultiplier'; policy: string; value: number }
  | { kind: 'premiumMultiplier'; value: number }
  | { kind: 'preventionMultiplier'; value: number }
  /** Payouts divided by this: the lawyers find reasons. */
  | { kind: 'payoutReduction'; value: number }
  /** The actuarial mainframe sets the risk appetite itself. */
  | { kind: 'actuary'; value: number };

export interface InsurerUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { takings?: number; policy?: { id: string; count: number } };
  effect: InsurerEffect;
}

const HANDCRAFTED: InsurerUpgradeDef[] = [
  { id: 'ins-script', name: 'SALES SCRIPT', description: '"Have you thought about what happens to your family?" Each sale counts x2.', cost: 50, unlock: { takings: 30 }, effect: { kind: 'saleMultiplier', value: 2 } },
  { id: 'ins-telesales', name: 'TELESALES FLOOR', description: 'Six phones and a list of survivors\' relatives. 1 sale per second, unattended.', cost: 100, unlock: { takings: 50 }, effect: { kind: 'autoSale', value: 1 } },
  { id: 'ins-checklists', name: 'HOME SAFETY CHECKLISTS', description: 'Printed, laminated, handed to every policyholder. Prevention x1.5.', cost: 300, unlock: { takings: 200 }, effect: { kind: 'preventionMultiplier', value: 1.5 } },
  { id: 'ins-small-print', name: 'THE SMALL PRINT', description: 'Exclusions for "acts of God". The lawyers argue Death is one. Payouts halved.', cost: 2_500, unlock: { takings: 1_500 }, effect: { kind: 'payoutReduction', value: 2 } },
  { id: 'ins-telesales-ii', name: 'TELESALES: NIGHT SHIFT', description: 'Calls go out after midnight, when people are frightened. +2 sales per second.', cost: 4_000, unlock: { takings: 3_000 }, effect: { kind: 'autoSale', value: 2 } },
  { id: 'ins-mainframe', name: 'ACTUARIAL MAINFRAME', description: 'A computer sets the risk appetite: as much as prevention can keep up with, never more.', cost: 3_000, unlock: { takings: 2_000 }, effect: { kind: 'actuary', value: 1 } },
  { id: 'ins-pagers', name: 'PAGERS FOR EVERY SURVIVOR', description: 'They can call for help the moment the omens start. Prevention x1.5.', cost: 20_000, unlock: { takings: 15_000 }, effect: { kind: 'preventionMultiplier', value: 1.5 } },
  { id: 'ins-ads', name: 'TELEVISION ADVERTISING', description: '"Providence Mutual: because you never know." Premiums x1.25.', cost: 50_000, unlock: { takings: 40_000 }, effect: { kind: 'premiumMultiplier', value: 1.25 } },
  { id: 'ins-telesales-iii', name: 'TELESALES: AUTODIALER', description: 'The machine calls everyone in the phone book in alphabetical order. +5 sales per second.', cost: 60_000, unlock: { takings: 50_000 }, effect: { kind: 'autoSale', value: 5 } },
  { id: 'ins-arbitration', name: 'MANDATORY ARBITRATION', description: 'Claims go to a panel the company picks. Payouts halved again.', cost: 400_000, unlock: { takings: 300_000 }, effect: { kind: 'payoutReduction', value: 2 } },
  { id: 'ins-telesales-iv', name: 'TELESALES: IT CALLS ITSELF', description: 'Nobody remembers programming the overnight calls. +12 sales per second.', cost: 1_000_000, unlock: { takings: 800_000 }, effect: { kind: 'autoSale', value: 12 } },
  { id: 'ins-premonitions', name: 'PREMONITION HOTLINE', description: 'A number to call if you see it coming. A lot of people see it coming. Prevention x2.', cost: 2_000_000, unlock: { takings: 1_500_000 }, effect: { kind: 'preventionMultiplier', value: 2 } },
  { id: 'ins-national', name: 'NATIONAL EXPANSION', description: 'Offices in every state with an airport. Premiums x1.5.', cost: 5_000_000, unlock: { takings: 4_000_000 }, effect: { kind: 'premiumMultiplier', value: 1.5 } },
  { id: 'ins-reinsure-death', name: 'REINSURE THE DESIGN', description: 'You find a reinsurer willing to cover acts of Death. You do not meet them. Premiums x2.', cost: 500_000_000, unlock: { takings: 400_000_000 }, effect: { kind: 'premiumMultiplier', value: 2 } },
];

const TIERS = [
  { suffix: 'II', count: 10, costFactor: 15, note: 'Repriced by the actuaries.' },
  { suffix: 'III', count: 25, costFactor: 150, note: 'New riders and exclusions.' },
  { suffix: 'IV', count: 50, costFactor: 2_000, note: 'Terms nobody outside the company has read.' },
];

const POLICY_TIERS: InsurerUpgradeDef[] = POLICIES.flatMap((p) =>
  TIERS.map((t) => ({
    id: `${p.id}-${t.count}`,
    name: `${p.name} ${t.suffix}`,
    description: `${t.note} ${p.name} premiums x2.`,
    cost: p.baseCost * t.costFactor,
    unlock: { policy: { id: p.id, count: t.count } },
    effect: { kind: 'policyMultiplier', policy: p.id, value: 2 } as const,
  })),
);

export const INSURER_UPGRADES: readonly InsurerUpgradeDef[] = [...HANDCRAFTED, ...POLICY_TIERS];
