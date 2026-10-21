import { ATTRACTIONS } from './shallows';

export type FathomEffect =
  | { kind: 'passMultiplier'; value: number }
  /** Beach passes sold per second without the player. */
  | { kind: 'autoPasses'; value: number }
  | { kind: 'attractionMultiplier'; attraction: string; value: number }
  | { kind: 'guardMultiplier'; value: number }
  /** The head lifeguard opens the beach as wide as the watch covers. */
  | { kind: 'autoOpen'; value: number }
  | { kind: 'catchMultiplier'; value: number }
  /** The sonar operator sends the boats exactly as far as the buoys can see. */
  | { kind: 'autoRange'; value: number }
  | { kind: 'researchMultiplier'; value: number }
  /** The lab protocol pushes enhancement as far as the pens will hold. */
  | { kind: 'autoEnhance'; value: number }
  | { kind: 'sampleMultiplier'; value: number }
  /** The station computer runs the station as deep as the hull will hold. */
  | { kind: 'autoStation'; value: number }
  | { kind: 'levyMultiplier'; value: number };

export interface FathomUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { earned?: number; attraction?: { id: string; count: number } };
  effect: FathomEffect;
}

const HANDCRAFTED: FathomUpgradeDef[] = [
  { id: 'pass-stamps', name: 'RUBBER STAMPS', description: 'Passes stamped, not written. Each pass sold counts x2.', cost: 50, unlock: { earned: 30 }, effect: { kind: 'passMultiplier', value: 2 } },
  { id: 'pass-machine', name: 'PASS MACHINE', description: 'A coin machine by the boardwalk. 1 pass per second, unattended.', cost: 100, unlock: { earned: 50 }, effect: { kind: 'autoPasses', value: 1 } },
  { id: 'whistles', name: 'BRASS WHISTLES', description: 'Every guard heard from the far end of the beach. Every guard watches x1.5.', cost: 300, unlock: { earned: 200 }, effect: { kind: 'guardMultiplier', value: 1.5 } },
  { id: 'head-lifeguard', name: 'HEAD LIFEGUARD', description: 'Someone in the tall chair who decides how much beach to open: as much as the watch can cover, no more.', cost: 3_000, unlock: { earned: 2_000 }, effect: { kind: 'autoOpen', value: 1 } },
  { id: 'pass-machine-ii', name: 'TURNSTILES', description: 'Every boardwalk entrance takes coins. +2 passes per second.', cost: 4_000, unlock: { earned: 3_000 }, effect: { kind: 'autoPasses', value: 2 } },
  { id: 'cold-store', name: 'HARBOUR COLD STORE', description: 'The catch keeps until the price is right. All catch x1.5.', cost: 20_000, unlock: { earned: 15_000 }, effect: { kind: 'catchMultiplier', value: 1.5 } },
  { id: 'sonar-operator', name: 'SONAR OPERATOR', description: 'A night shift at the screen, sending each boat exactly as far as the buoys can see.', cost: 30_000, unlock: { earned: 25_000 }, effect: { kind: 'autoRange', value: 1 } },
  { id: 'pass-machine-iii', name: 'SEASON TICKETS', description: 'Sold all winter, used all summer. +5 passes per second.', cost: 60_000, unlock: { earned: 50_000 }, effect: { kind: 'autoPasses', value: 5 } },
  { id: 'grant', name: 'MARINE SCIENCE GRANT', description: 'The university pays for the papers, and asks no questions about the pens. All research x1.5.', cost: 500_000, unlock: { earned: 400_000 }, effect: { kind: 'researchMultiplier', value: 1.5 } },
  { id: 'lab-protocol', name: 'LAB PROTOCOL 9', description: 'The parent company\'s dosing schedule: enhance every specimen as far as the pens will hold it.', cost: 800_000, unlock: { earned: 600_000 }, effect: { kind: 'autoEnhance', value: 1 } },
  { id: 'nets-ii', name: 'STEEL-CABLE NETS', description: 'Nets that bite back. Every guard watches x1.5 again.', cost: 1_000_000, unlock: { earned: 800_000 }, effect: { kind: 'guardMultiplier', value: 1.5 } },
  { id: 'sample-contract', name: 'ABYSSAL SAMPLE CONTRACT', description: 'A buyer who wants everything from the trench, sight unseen. All samples x1.5.', cost: 50_000_000, unlock: { earned: 40_000_000 }, effect: { kind: 'sampleMultiplier', value: 1.5 } },
  { id: 'station-computer', name: 'STATION COMPUTER', description: 'It reads every strain gauge at once, and holds the station as deep as the hull allows.', cost: 80_000_000, unlock: { earned: 60_000_000 }, effect: { kind: 'autoStation', value: 1 } },
  { id: 'defence-board', name: 'COASTAL DEFENCE BOARD', description: 'The government pays for every city still standing. All levies x2.', cost: 5_000_000_000, unlock: { earned: 4_000_000_000 }, effect: { kind: 'levyMultiplier', value: 2 } },
];

const TIERS = [
  { suffix: 'II', count: 10, costFactor: 15, note: 'A fresh coat of paint and a new sign.' },
  { suffix: 'III', count: 25, costFactor: 150, note: 'The council\'s tourism fund, spent before anyone asked.' },
  { suffix: 'IV', count: 50, costFactor: 2_000, note: 'A resort chain buys in. The prices go up. The crowds come anyway.' },
];

const ATTRACTION_TIERS: FathomUpgradeDef[] = ATTRACTIONS.flatMap((a) =>
  TIERS.map((tier) => ({
    id: `${a.id}-${tier.count}`,
    name: `${a.name} ${tier.suffix}`,
    description: `${tier.note} ${a.name} money x2.`,
    cost: a.baseCost * tier.costFactor,
    unlock: { attraction: { id: a.id, count: tier.count } },
    effect: { kind: 'attractionMultiplier', attraction: a.id, value: 2 } as const,
  })),
);

export const FATHOM_UPGRADES: readonly FathomUpgradeDef[] = [...HANDCRAFTED, ...ATTRACTION_TIERS];
