import { CREW } from '../data/crew';
import { crewStatus } from '../mission/crew';
import {
  createMission,
  DEFAULT_MISSION_CONFIG,
  isOrganism,
  TERRAFORM_MISSION_CONFIG,
  SECURITY_MISSION_CONFIG,
  HAULAGE_MISSION_CONFIG,
  SALVAGE_MISSION_CONFIG,
  OVERLAND_MISSION_CONFIG,
  type MissionConfig,
  type HorrorId,
  type MissionState,
  type ScenarioId,
} from '../mission/state';
import { horrorOf, scenarioOf } from '../mission/registry';
import { nextRandom } from '../shared/rng';
import type { ContractRecord, GameState, Profile } from './game';

export type Ending = 'deliver' | 'scuttle' | 'broadcast';
export interface Reward {
  seniority: number;
  conscience: number;
}

export const BOARDROOM_UNLOCK_CONTRACTS = 10;
/**
 * Completed contracts before each kind of contract is offered (user, 2026-10-22: one to start, the rest unlocked).
 * The overland haul is the way in; finishing it is the promotion to the long haul, and to extraction.
 */
export const EXTRACTION_UNLOCK_CONTRACTS = 1;
export const HAULAGE_UNLOCK_CONTRACTS = 1;
export const TERRAFORM_UNLOCK_CONTRACTS = 2;
export const SECURITY_UNLOCK_CONTRACTS = 3;
export const SALVAGE_UNLOCK_CONTRACTS = 4;
/** Completed contracts before each play-as-the-horror tier is offered. */
export const CREATURE_UNLOCK_CONTRACTS = 3;
export const HUNTER_UNLOCK_CONTRACTS = 5;
/** Completed contracts before a contract may turn out to be an outbreak (docs/OUTBREAK.md). */
export const OUTBREAK_UNLOCK_CONTRACTS = 6;
/** The same horror at most this many contracts running. */
const HORROR_RUN = 2;
const DRAWN: readonly HorrorId[] = ['organism', 'outbreak'];
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

/** Tugs of the Combine's salvage division. */
const SALVAGE_NAMES = ['Corvid Tithe', 'Gannet Lien', 'Patient Claim', 'Rook Assessor', 'Margery Writ'];

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
  salvage: SALVAGE_MISSION_CONFIG,
};

const NAMES: Record<ScenarioId, readonly string[]> = {
  extraction: SHIP_NAMES,
  terraform: STATION_NAMES,
  security: TRANSPORT_NAMES,
  haulage: TUG_NAMES,
  overland: RIG_NAMES,
  salvage: SALVAGE_NAMES,
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

const UNLOCKS: readonly [ScenarioId, number][] = [
  // The short way in comes first.
  ['overland', 0],
  ['extraction', EXTRACTION_UNLOCK_CONTRACTS],
  ['haulage', HAULAGE_UNLOCK_CONTRACTS],
  ['terraform', TERRAFORM_UNLOCK_CONTRACTS],
  ['security', SECURITY_UNLOCK_CONTRACTS],
  ['salvage', SALVAGE_UNLOCK_CONTRACTS],
];

/** Completed contracts before this kind of contract is offered. */
export const assignmentUnlock = (scenario: ScenarioId): number => UNLOCKS.find(([id]) => id === scenario)?.[1] ?? 0;

export function availableAssignments(profile: Profile): ScenarioId[] {
  return UNLOCKS.filter(([, needed]) => profile.contractsCompleted >= needed).map(([id]) => id);
}

export const isCreatureUnlocked = (profile: Profile): boolean => profile.contractsCompleted >= CREATURE_UNLOCK_CONTRACTS;
/** Legend as the creature that opens the hunt early: a horror that has done well earns the next one. */
export const HUNTER_LEGEND = 3;
export const isHunterUnlocked = (profile: Profile): boolean =>
  profile.contractsCompleted >= HUNTER_UNLOCK_CONTRACTS || (profile.legend.creature ?? 0) >= HUNTER_LEGEND;

/**
 * Which horror a new contract gets: the scenario's own until the outbreak is unlocked, then organism or outbreak drawn
 * from the contract seed, never the same three times running. Hidden from the assignment screen on purpose.
 */
export function horrorFor(profile: Profile, scenario: ScenarioId, seed: number): HorrorId {
  const own = BASE_CONFIGS[scenario].horror;
  if (!DRAWN.includes(own) || profile.contractsCompleted < OUTBREAK_UNLOCK_CONTRACTS) return own;
  const recent = profile.history.slice(-HORROR_RUN).map((r) => r.horror);
  if (recent.length === HORROR_RUN && recent.every((h) => h === recent[0]) && DRAWN.includes(recent[0]!)) return DRAWN.find((h) => h !== recent[0])!;
  const [roll] = nextRandom(seed);
  return DRAWN[Math.floor(roll * DRAWN.length)]!;
}

/** Starts the chosen contract. Whatever was running is abandoned without reward. */
export function chooseAssignment(game: GameState, scenario: ScenarioId, seed: number): GameState {
  if (!availableAssignments(game.profile).includes(scenario)) return game;
  const config = { ...missionConfigFor(game.profile, scenario), horror: horrorFor(game.profile, scenario, seed) };
  return { ...game, assigning: false, mission: createMission(config, seed) };
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

/** What a finished contract leaves on the books, for the player's history or the Board's ledger. */
export function missionRecord(m: MissionState, ending: string): ContractRecord {
  return {
    scenario: m.scenario,
    horror: m.horror,
    shipName: m.config.shipName,
    ending,
    ...scenarioOf(m).outcome(m),
    specimens: specimensHeld(m),
    crewSurvived: CREW.filter((c) => crewStatus(m, c.id) !== 'lost').length,
    duration: m.elapsed,
  };
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
    history: [...game.profile.history, missionRecord(m, ending)],
  };
  // The next contract is chosen on the assignment screen; this placeholder never runs.
  return { ...game, profile, assigning: 'renewal', mission: createMission(missionConfigFor(profile, m.scenario), seed) };
}

export function isBoardroomUnlocked(profile: Profile): boolean {
  return profile.contractsCompleted >= BOARDROOM_UNLOCK_CONTRACTS;
}
