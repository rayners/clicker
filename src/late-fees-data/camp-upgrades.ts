import { COUNSELORS } from './camp';

export type CampEffect =
  | { kind: 'whistleMultiplier'; value: number }
  /** Whistle calls per second made by the camp PA without the director. */
  | { kind: 'autoWhistle'; value: number }
  | { kind: 'lightMultiplier'; value: number }
  | { kind: 'counselorMultiplier'; counselor: string; value: number }
  | { kind: 'staffMultiplier'; value: number }
  | { kind: 'feeMultiplier'; value: number }
  /** Light demand divided by this. */
  | { kind: 'lightEfficiency'; value: number }
  | { kind: 'towerMultiplier'; value: number }
  /** The head counselor splits staff between prep and watch. */
  | { kind: 'headCounselor'; value: number };

export interface CampUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { takings?: number; counselor?: { id: string; count: number }; towers?: number };
  effect: CampEffect;
}

const HANDCRAFTED: CampUpgradeDef[] = [
  { id: 'camp-megaphone', name: 'MEGAPHONE', description: 'The whistle carries to the far cabins. Each whistle x2.', cost: 50, unlock: { takings: 30 }, effect: { kind: 'whistleMultiplier', value: 2 } },
  { id: 'camp-pa', name: 'CAMP PA SYSTEM', description: 'Reveille, announcements, a whistle on the hour. 1 whistle per second, unattended.', cost: 100, unlock: { takings: 50 }, effect: { kind: 'autoWhistle', value: 1 } },
  { id: 'camp-mantles', name: 'SPARE MANTLES', description: 'The lanterns stop guttering out. Light x1.5.', cost: 300, unlock: { takings: 200 }, effect: { kind: 'lightMultiplier', value: 1.5 } },
  { id: 'camp-buddy', name: 'BUDDY SYSTEM', description: 'Nobody goes anywhere alone. In theory. Light demand halved.', cost: 2_500, unlock: { takings: 1_500 }, effect: { kind: 'lightEfficiency', value: 2 } },
  { id: 'camp-pa-ii', name: 'PA: CALL-AND-RESPONSE', description: 'Every cabin answers the hourly call. +2 whistles per second.', cost: 4_000, unlock: { takings: 3_000 }, effect: { kind: 'autoWhistle', value: 2 } },
  { id: 'camp-head', name: 'HEAD COUNSELOR', description: 'A veteran takes the roster: exactly enough on watch, everyone else opening up the camp.', cost: 3_000, unlock: { takings: 2_000 }, effect: { kind: 'headCounselor', value: 1 } },
  { id: 'camp-wiring', name: 'REWIRED CABINS', description: 'Porch lights on every cabin. Light x1.5.', cost: 20_000, unlock: { takings: 15_000 }, effect: { kind: 'lightMultiplier', value: 1.5 } },
  { id: 'camp-brochure', name: 'GLOSSY BROCHURE', description: 'Canoes, campfires, and nothing about 1958. Fees x1.25.', cost: 50_000, unlock: { takings: 40_000 }, effect: { kind: 'feeMultiplier', value: 1.25 } },
  { id: 'camp-pa-iii', name: 'PA: ROLL CALL', description: 'Names read every quarter hour. The silences are noted. +5 whistles per second.', cost: 60_000, unlock: { takings: 50_000 }, effect: { kind: 'autoWhistle', value: 5 } },
  { id: 'camp-coffee', name: 'NIGHT-SHIFT COFFEE', description: 'Nobody sleeps on watch. All staff x1.25.', cost: 400_000, unlock: { takings: 300_000 }, effect: { kind: 'staffMultiplier', value: 1.25 } },
  { id: 'camp-pa-iv', name: 'PA: IT NEVER STOPS', description: 'The camp PA runs all night now. Nobody remembers who set it. +12 whistles per second.', cost: 1_000_000, unlock: { takings: 800_000 }, effect: { kind: 'autoWhistle', value: 12 } },
  { id: 'camp-substation', name: 'CAMP SUBSTATION', description: 'Transformers humming by the mess hall. Light x2.', cost: 2_000_000, unlock: { takings: 1_500_000 }, effect: { kind: 'lightMultiplier', value: 2 } },
  { id: 'camp-tours', name: 'NIGHT TOURS', description: 'Thrill-seekers pay double to hear the story by the lake. Fees x1.5.', cost: 5_000_000, unlock: { takings: 4_000_000 }, effect: { kind: 'feeMultiplier', value: 1.5 } },
  { id: 'camp-movie-rights', name: 'MOVIE RIGHTS', description: 'A studio options the story of the camp. The cameras want the real place. Fees x2.', cost: 500_000_000, unlock: { takings: 400_000_000 }, effect: { kind: 'feeMultiplier', value: 2 } },
];

const TIERS = [
  { suffix: 'II', count: 10, costFactor: 15, note: 'Orientation week, done properly this time.' },
  { suffix: 'III', count: 25, costFactor: 150, note: 'First-aid certificates and air horns.' },
  { suffix: 'IV', count: 50, costFactor: 2_000, note: 'Training nobody will admit is for this.' },
];

const COUNSELOR_TIERS: CampUpgradeDef[] = COUNSELORS.flatMap((c) =>
  TIERS.map((t) => ({
    id: `${c.id}-${t.count}`,
    name: `${c.name} TRAINING ${t.suffix}`,
    description: `${t.note} ${c.name} staffing x2.`,
    cost: c.baseCost * t.costFactor,
    unlock: { counselor: { id: c.id, count: t.count } },
    effect: { kind: 'counselorMultiplier', counselor: c.id, value: 2 } as const,
  })),
);

const TOWER_TIERS: CampUpgradeDef[] = [
  { count: 5, cost: 20_000, value: 5, name: 'WATCHTOWERS: SEARCHLIGHTS', note: 'A beam that sweeps the treeline.' },
  { count: 15, cost: 2_000_000, value: 10, name: 'WATCHTOWERS: AIR-RAID SIRENS', note: 'Bought from the county surplus. Loud enough to wake the lake.' },
  { count: 30, cost: 300_000_000, value: 10, name: 'WATCHTOWERS: FLARES', note: 'The whole shore lit red every time something moves.' },
].map((t) => ({
  id: `tower-${t.count}`,
  name: t.name,
  description: `${t.note} Watchtower watch x${t.value}.`,
  cost: t.cost,
  unlock: { towers: t.count },
  effect: { kind: 'towerMultiplier', value: t.value } as const,
}));

export const CAMP_UPGRADES: readonly CampUpgradeDef[] = [...HANDCRAFTED, ...COUNSELOR_TIERS, ...TOWER_TIERS];
