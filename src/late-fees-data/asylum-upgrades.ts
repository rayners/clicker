import { WARDS } from './asylum';

export type AsylumEffect =
  | { kind: 'roundsMultiplier'; value: number }
  /** Rounds per second walked by night attendants without the superintendent. */
  | { kind: 'autoRounds'; value: number }
  | { kind: 'wardMultiplier'; ward: string; value: number }
  | { kind: 'fundingMultiplier'; value: number }
  | { kind: 'calmMultiplier'; value: number }
  /** Agitation builds this many times more slowly: art therapy, routine, a garden. */
  | { kind: 'calmer'; value: number }
  /** Each security door holds this many times better. */
  | { kind: 'doorMultiplier'; value: number }
  /** Escapees are found this many times faster. */
  | { kind: 'searchMultiplier'; value: number }
  /** The pharmacy sets the sedation dial itself: just enough to keep the wards calm. */
  | { kind: 'autoSedation'; value: number };

export interface AsylumUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { takings?: number; ward?: { id: string; count: number } };
  effect: AsylumEffect;
}

const HANDCRAFTED: AsylumUpgradeDef[] = [
  { id: 'asylum-clipboard', name: 'ROUNDS CLIPBOARD', description: 'Every round signed and billed to the state. Each round counts x2.', cost: 50, unlock: { takings: 30 }, effect: { kind: 'roundsMultiplier', value: 2 } },
  { id: 'asylum-night-attendants', name: 'NIGHT ATTENDANTS', description: 'Someone walks the corridors all night. 1 round per second, unattended.', cost: 100, unlock: { takings: 50 }, effect: { kind: 'autoRounds', value: 1 } },
  { id: 'asylum-routine', name: 'DAILY ROUTINE', description: 'Meals, chores and lights out on the same bell, every day. Agitation builds a third more slowly.', cost: 300, unlock: { takings: 200 }, effect: { kind: 'calmer', value: 1.5 } },
  { id: 'asylum-sheriff', name: 'SHERIFF LIAISON', description: 'A deputy on call for escapes. Escapees are found twice as fast.', cost: 800, unlock: { takings: 600 }, effect: { kind: 'searchMultiplier', value: 2 } },
  { id: 'asylum-pharmacy', name: 'PHARMACY PROTOCOL', description: 'The pharmacy doses each ward by chart: just enough sedation to keep it calm, and no more than the inspector will see.', cost: 3_000, unlock: { takings: 2_000 }, effect: { kind: 'autoSedation', value: 1 } },
  { id: 'asylum-night-attendants-ii', name: 'DOUBLE NIGHT SHIFT', description: 'Two attendants per corridor after dark. +2 rounds per second.', cost: 4_000, unlock: { takings: 3_000 }, effect: { kind: 'autoRounds', value: 2 } },
  { id: 'asylum-deadbolts', name: 'DEADBOLTS', description: 'A second lock on every security door. Each door holds x2.', cost: 6_000, unlock: { takings: 5_000 }, effect: { kind: 'doorMultiplier', value: 2 } },
  { id: 'asylum-art', name: 'ART THERAPY', description: 'Crayons, paper, and an hour a day. Ward Ten draws the same house every time. Agitation builds a third more slowly again.', cost: 20_000, unlock: { takings: 15_000 }, effect: { kind: 'calmer', value: 1.5 } },
  { id: 'asylum-accreditation', name: 'STATE ACCREDITATION', description: 'A plaque in the lobby and a higher rate per bed. All funding x1.25.', cost: 50_000, unlock: { takings: 40_000 }, effect: { kind: 'fundingMultiplier', value: 1.25 } },
  { id: 'asylum-night-attendants-iii', name: 'ROUND-THE-CLOCK OBSERVATION', description: 'Nobody on the hill is ever unobserved again. +5 rounds per second.', cost: 60_000, unlock: { takings: 50_000 }, effect: { kind: 'autoRounds', value: 5 } },
  { id: 'asylum-dogs', name: 'TRACKING DOGS', description: 'The county kennel lends its bloodhounds. They will not go near Ward Ten. Escapees are found twice as fast again.', cost: 400_000, unlock: { takings: 300_000 }, effect: { kind: 'searchMultiplier', value: 2 } },
  { id: 'asylum-teaching', name: 'TEACHING HOSPITAL', description: 'The university sends its students, and its grants. Staff calm x1.5.', cost: 1_000_000, unlock: { takings: 800_000 }, effect: { kind: 'calmMultiplier', value: 1.5 } },
  { id: 'asylum-federal', name: 'FEDERAL CONTRACT', description: 'The government sends patients it does not want seen, and pays to keep them unseen. All funding x1.5.', cost: 5_000_000, unlock: { takings: 4_000_000 }, effect: { kind: 'fundingMultiplier', value: 1.5 } },
  { id: 'asylum-steel', name: 'STEEL DOORS', description: 'Bank-vault doors on the secure wing. Each door holds x2 again. They will not hold him.', cost: 30_000_000, unlock: { takings: 20_000_000 }, effect: { kind: 'doorMultiplier', value: 2 } },
  { id: 'asylum-study', name: 'THE WARD TEN MONOGRAPH', description: 'A doctor publishes on the patient in Ward Ten. The book sells. The hospital is paid for the rights. All funding x2.', cost: 500_000_000, unlock: { takings: 400_000_000 }, effect: { kind: 'fundingMultiplier', value: 2 } },
];

const TIERS = [
  { suffix: 'II', count: 10, costFactor: 15, note: 'New mattresses and a coat of paint.' },
  { suffix: 'III', count: 25, costFactor: 150, note: 'A grant for the ward, spent before anyone could ask.' },
  { suffix: 'IV', count: 50, costFactor: 2_000, note: 'Federal money, and a federal inspector who never visits.' },
];

const WARD_TIERS: AsylumUpgradeDef[] = WARDS.flatMap((w) =>
  TIERS.map((tier) => ({
    id: `${w.id}-${tier.count}`,
    name: `${w.name} ${tier.suffix}`,
    description: `${tier.note} ${w.name} funding x2.`,
    cost: w.baseCost * tier.costFactor,
    unlock: { ward: { id: w.id, count: tier.count } },
    effect: { kind: 'wardMultiplier', ward: w.id, value: 2 } as const,
  })),
);

export const ASYLUM_UPGRADES: readonly AsylumUpgradeDef[] = [...HANDCRAFTED, ...WARD_TIERS];
