import { CREW } from '../data/crew';
import { crewStatus } from '../mission/crew';
import {
  createMission,
  DEFAULT_MISSION_CONFIG,
  isOrganism,
  TERRAFORM_MISSION_CONFIG,
  SECURITY_MISSION_CONFIG,
  HAULAGE_MISSION_CONFIG,
  OVERLAND_MISSION_CONFIG,
  type MissionConfig,
  type MissionState,
  type ScenarioId,
} from '../mission/state';
import { horrorOf, scenarioOf } from '../mission/registry';
import type { GameState, Profile } from './game';

export type Ending = 'deliver' | 'scuttle' | 'broadcast';
export interface Reward {
  seniority: number;
  conscience: number;
}

export const BOARDROOM_UNLOCK_CONTRACTS = 10;
/** Completed contracts before terraforming is offered. Zero while it is being play-tested; meant to rise. */
export const TERRAFORM_UNLOCK_CONTRACTS = 0;
/** Completed contracts before security contracts are offered. Zero while play-tested. */
export const SECURITY_UNLOCK_CONTRACTS = 0;
/** Completed contracts before haulage contracts are offered. Zero while play-tested. */
export const HAULAGE_UNLOCK_CONTRACTS = 0;
const BROADCAST_MIN_CYCLE = 3;
const BROADCAST_MIN_CONSCIENCE = 3;
const SPECIMENS_PER_SENIORITY = 5;
const SENIORITY_PRODUCTION = 0.25;
const INCIDENT_REDUCTION_PER_CONSCIENCE = 0.2;

const SHIP_NAMES = [
  'MSV Calloway Reach',
  'MSV Hesper Vane',
  'MSV Ardent Lowell',
  'MSV Corrin Gate',
  'MSV Sable Meridian',
  'MSV Tamsin Drift',
  'MSV Orrery Kell',
];

const TRANSPORT_NAMES = [
  'CSV Bellwether Ascent',
  'CSV Garrick Hale',
  'CSV Steadfast Lumen',
  'CSV Iron Psalter',
  'CSV Marrow Vigil',
];

/** Crawler rigs of the Combine's road freight. */
const RIG_NAMES = ['Crawler Rig Dorothea', 'Crawler Rig Big Esther', 'Crawler Rig Mule', 'Crawler Rig Saint Agnes'];

/** Commercial tugs of the Combine's freight division. */
const TUG_NAMES = ['Halvorsen Gale', 'Brisk Annie', 'Marguerite Holt', 'Long Patience', 'Saltmarsh Kay', 'Old Reliable'];

const STATION_NAMES = [
  'Ostrava-9 Station',
  'Brennac-4 Station',
  'Hollis Deep Station',
  'Varga-11 Station',
  'Kestrel Basin Station',
];

function cycleName(names: readonly string[], cycle: number): string {
  const name = names[cycle % names.length]!;
  const series = Math.floor(cycle / names.length);
  return series === 0 ? name : `${name} ${series + 1}`;
}

export function shipNameFor(cycle: number): string {
  return cycleName(SHIP_NAMES, cycle);
}

const BASE_CONFIGS: Record<ScenarioId, MissionConfig> = {
  extraction: DEFAULT_MISSION_CONFIG,
  terraform: TERRAFORM_MISSION_CONFIG,
  security: SECURITY_MISSION_CONFIG,
  haulage: HAULAGE_MISSION_CONFIG,
  overland: OVERLAND_MISSION_CONFIG,
};

const NAMES: Record<ScenarioId, readonly string[]> = {
  extraction: SHIP_NAMES,
  terraform: STATION_NAMES,
  security: TRANSPORT_NAMES,
  haulage: TUG_NAMES,
  overland: RIG_NAMES,
};

/** The next mission is shaped by everything WARDEN carried out of previous ones. */
export function missionConfigFor(profile: Profile, scenario: ScenarioId = 'extraction'): MissionConfig {
  const names = NAMES[scenario];
  return {
    ...BASE_CONFIGS[scenario],
    shipName: cycleName(names, profile.contractsCompleted),
    productionMultiplier: 1 + SENIORITY_PRODUCTION * profile.seniority,
    extraLifeSupport: profile.conscience,
    incidentMultiplier: 1 / (1 + INCIDENT_REDUCTION_PER_CONSCIENCE * profile.conscience),
  };
}

export function availableAssignments(profile: Profile): ScenarioId[] {
  const unlocks: [ScenarioId, number][] = [
    // The short way in comes first.
    ['overland', 0],
    ['extraction', 0],
    ['terraform', TERRAFORM_UNLOCK_CONTRACTS],
    ['security', SECURITY_UNLOCK_CONTRACTS],
    ['haulage', HAULAGE_UNLOCK_CONTRACTS],
  ];
  return unlocks.filter(([, needed]) => profile.contractsCompleted >= needed).map(([id]) => id);
}

/** Starts the chosen contract. Whatever was running is abandoned without reward. */
export function chooseAssignment(game: GameState, scenario: ScenarioId, seed: number): GameState {
  if (!availableAssignments(game.profile).includes(scenario)) return game;
  return { ...game, assigning: false, mission: createMission(missionConfigFor(game.profile, scenario), seed) };
}

export function availableEndings(game: GameState): Ending[] {
  if (!game.mission.flags.includes('terminus')) return [];
  // Only the endings this contract's horror has words for: a quiet contract simply finishes.
  const words = horrorOf(game.mission).endings;
  const endings = (['deliver', 'scuttle'] as Ending[]).filter((e) => e in words);
  const { contractsCompleted, conscience } = game.profile;
  if ('broadcast' in words && contractsCompleted >= BROADCAST_MIN_CYCLE && conscience >= BROADCAST_MIN_CONSCIENCE) endings.push('broadcast');
  return endings;
}

/** Specimens held for the Combine: zero for horrors that have none. */
function specimensHeld(m: MissionState): number {
  return isOrganism(m) ? Math.floor(m.specimens) : 0;
}

function survivors(game: GameState): number {
  return CREW.filter((c) => crewStatus(game.mission, c.id) !== 'lost').length;
}

export function endingRewards(game: GameState): Record<Ending, Reward> {
  const seniority = 1 + Math.floor(specimensHeld(game.mission) / SPECIMENS_PER_SENIORITY);
  const conscience = 1 + survivors(game);
  return {
    deliver: { seniority, conscience: 0 },
    scuttle: { seniority: 0, conscience },
    broadcast: { seniority, conscience },
  };
}

export function completeContract(game: GameState, ending: Ending, seed: number): GameState {
  if (!availableEndings(game).includes(ending)) return game;
  const reward = endingRewards(game)[ending];
  const m = game.mission;
  const profile: Profile = {
    ...game.profile,
    seniority: game.profile.seniority + reward.seniority,
    conscience: game.profile.conscience + reward.conscience,
    contractsCompleted: game.profile.contractsCompleted + 1,
    deliveries: game.profile.deliveries + (ending === 'deliver' ? 1 : 0),
    endingsSeen: game.profile.endingsSeen.includes(ending) ? game.profile.endingsSeen : [...game.profile.endingsSeen, ending],
    history: [
      ...game.profile.history,
      {
        scenario: m.scenario,
        shipName: m.config.shipName,
        ending,
        ...scenarioOf(m).outcome(m),
        specimens: specimensHeld(m),
        crewSurvived: survivors(game),
        duration: m.elapsed,
      },
    ],
  };
  // The next contract is chosen on the assignment screen; this placeholder never runs.
  return { ...game, profile, assigning: 'renewal', mission: createMission(missionConfigFor(profile, m.scenario), seed) };
}

export function isBoardroomUnlocked(profile: Profile): boolean {
  return profile.contractsCompleted >= BOARDROOM_UNLOCK_CONTRACTS;
}
