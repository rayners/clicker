import { BEDS } from './clinic';

export type ClinicEffect =
  | { kind: 'readingMultiplier'; value: number }
  /** Readings per second taken by the chart recorders without the administrator. */
  | { kind: 'autoReading'; value: number }
  | { kind: 'bedMultiplier'; bed: string; value: number }
  | { kind: 'dataMultiplier'; value: number }
  | { kind: 'watchMultiplier'; value: number }
  /** Exposed deep sleepers are this many times less likely to die: they fight back in the dream. */
  | { kind: 'lucid'; value: number }
  | { kind: 'suppressantMultiplier'; value: number }
  /** The monitoring computer sets the deep-sleep dial itself. */
  | { kind: 'autoDial'; value: number };

export interface ClinicUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { takings?: number; bed?: { id: string; count: number } };
  effect: ClinicEffect;
}

const HANDCRAFTED: ClinicUpgradeDef[] = [
  { id: 'clinic-clipboards', name: 'BETTER CLIPBOARDS', description: 'Pre-printed forms. Each reading counts x2.', cost: 50, unlock: { takings: 30 }, effect: { kind: 'readingMultiplier', value: 2 } },
  { id: 'clinic-chart-recorder', name: 'CHART RECORDERS', description: 'Pens on paper rolls take the readings. 1 reading per second, unattended.', cost: 100, unlock: { takings: 50 }, effect: { kind: 'autoReading', value: 1 } },
  { id: 'clinic-thermos', name: 'BOTTOMLESS THERMOS', description: 'The night staff stay sharp. Watch x1.5.', cost: 300, unlock: { takings: 200 }, effect: { kind: 'watchMultiplier', value: 1.5 } },
  { id: 'clinic-lucid-1', name: 'LUCID DREAMING: INTRODUCTION', description: 'Patients learn to notice they are dreaming. Exposed sleepers die half as often.', cost: 2_500, unlock: { takings: 1_500 }, effect: { kind: 'lucid', value: 2 } },
  { id: 'clinic-chart-recorder-ii', name: 'CHART RECORDERS: SECOND ROLL', description: 'Twice the paper, twice the pens. +2 readings per second.', cost: 4_000, unlock: { takings: 3_000 }, effect: { kind: 'autoReading', value: 2 } },
  { id: 'clinic-auto-dial', name: 'AUTOMATED MONITORING', description: 'A computer in the observation room sets the deep-sleep dial: as deep as the watch allows, never below what patients need.', cost: 3_000, unlock: { takings: 2_000 }, effect: { kind: 'autoDial', value: 1 } },
  { id: 'clinic-buzzers', name: 'BEDSIDE BUZZERS', description: 'A buzzer under every pillow, wired to the station. Watch x1.5.', cost: 20_000, unlock: { takings: 15_000 }, effect: { kind: 'watchMultiplier', value: 1.5 } },
  { id: 'clinic-journal', name: 'JOURNAL PUBLICATION', description: 'The first paper is accepted. The grant renews early. All data x1.25.', cost: 50_000, unlock: { takings: 40_000 }, effect: { kind: 'dataMultiplier', value: 1.25 } },
  { id: 'clinic-chart-recorder-iii', name: 'CHART RECORDERS: CONTINUOUS FEED', description: 'The paper never stops. Nobody remembers changing the rolls. +5 readings per second.', cost: 60_000, unlock: { takings: 50_000 }, effect: { kind: 'autoReading', value: 5 } },
  { id: 'clinic-lucid-2', name: 'LUCID DREAMING: DREAM CONTROL', description: 'Patients can change the dream. Some can wake themselves. Exposed sleepers die half as often again.', cost: 400_000, unlock: { takings: 300_000 }, effect: { kind: 'lucid', value: 2 } },
  { id: 'clinic-ration', name: 'RATION APPEAL', description: 'The grant-holder releases more suppressant, grudgingly. Each allocation protects x2.', cost: 1_000_000, unlock: { takings: 800_000 }, effect: { kind: 'suppressantMultiplier', value: 2 } },
  { id: 'clinic-pharma', name: 'PHARMACEUTICAL PARTNER', description: 'A drug company sponsors the study, on condition the results are theirs. All data x1.5.', cost: 5_000_000, unlock: { takings: 4_000_000 }, effect: { kind: 'dataMultiplier', value: 1.5 } },
  { id: 'clinic-lucid-3', name: 'LUCID DREAMING: DREAM WARRIORS', description: 'Patients meet in the same dream and fight together. Exposed sleepers die half as often again.', cost: 30_000_000, unlock: { takings: 20_000_000 }, effect: { kind: 'lucid', value: 2 } },
  { id: 'clinic-defense', name: 'DEFENSE CONTRACT', description: 'The military wants what the dream recorder prints. Do not ask what for. All data x2.', cost: 500_000_000, unlock: { takings: 400_000_000 }, effect: { kind: 'dataMultiplier', value: 2 } },
];

const TIERS = [
  { suffix: 'II', count: 10, costFactor: 15, note: 'New sensors from the grant-holder.' },
  { suffix: 'III', count: 25, costFactor: 150, note: 'Recalibrated against the worst nights.' },
  { suffix: 'IV', count: 50, costFactor: 2_000, note: 'Equipment nobody can explain the purchase order for.' },
];

const BED_TIERS: ClinicUpgradeDef[] = BEDS.flatMap((b) =>
  TIERS.map((t) => ({
    id: `${b.id}-${t.count}`,
    name: `${b.name} ${t.suffix}`,
    description: `${t.note} ${b.name} data x2.`,
    cost: b.baseCost * t.costFactor,
    unlock: { bed: { id: b.id, count: t.count } },
    effect: { kind: 'bedMultiplier', bed: b.id, value: 2 } as const,
  })),
);

export const CLINIC_UPGRADES: readonly ClinicUpgradeDef[] = [...HANDCRAFTED, ...BED_TIERS];
