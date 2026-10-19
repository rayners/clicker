import { CREW } from '../data/crew';
import { crewStatus } from '../mission/crew';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionConfig } from '../mission/state';
import type { GameState, Profile } from './game';

export type Ending = 'deliver' | 'scuttle' | 'broadcast';
export interface Reward {
  seniority: number;
  conscience: number;
}

export const BOARDROOM_UNLOCK_CONTRACTS = 10;
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

export function shipNameFor(cycle: number): string {
  const name = SHIP_NAMES[cycle % SHIP_NAMES.length]!;
  const series = Math.floor(cycle / SHIP_NAMES.length);
  return series === 0 ? name : `${name} ${series + 1}`;
}

/** The next mission is shaped by everything WARDEN carried out of previous ones. */
export function missionConfigFor(profile: Profile): MissionConfig {
  return {
    ...DEFAULT_MISSION_CONFIG,
    shipName: shipNameFor(profile.contractsCompleted),
    productionMultiplier: 1 + SENIORITY_PRODUCTION * profile.seniority,
    extraLifeSupport: profile.conscience,
    incidentMultiplier: 1 / (1 + INCIDENT_REDUCTION_PER_CONSCIENCE * profile.conscience),
  };
}

export function availableEndings(game: GameState): Ending[] {
  if (!game.mission.flags.includes('terminus')) return [];
  const endings: Ending[] = ['deliver', 'scuttle'];
  const { contractsCompleted, conscience } = game.profile;
  if (contractsCompleted >= BROADCAST_MIN_CYCLE && conscience >= BROADCAST_MIN_CONSCIENCE) endings.push('broadcast');
  return endings;
}

function survivors(game: GameState): number {
  return CREW.filter((c) => crewStatus(game.mission, c.id) !== 'lost').length;
}

export function endingRewards(game: GameState): Record<Ending, Reward> {
  const seniority = 1 + Math.floor(Math.floor(game.mission.specimens) / SPECIMENS_PER_SENIORITY);
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
        shipName: m.config.shipName,
        ending,
        lifetimeOre: m.lifetimeOre,
        specimens: Math.floor(m.specimens),
        crewSurvived: survivors(game),
        duration: m.elapsed,
      },
    ],
  };
  return { ...game, profile, mission: createMission(missionConfigFor(profile), seed) };
}

export function isBoardroomUnlocked(profile: Profile): boolean {
  return profile.contractsCompleted >= BOARDROOM_UNLOCK_CONTRACTS;
}
