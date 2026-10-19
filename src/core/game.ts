import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../mission/state';
import { tickMission } from '../mission/tick';

export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 1;

/** Compact record of a finished mission, kept forever in the profile. */
export interface ContractRecord {
  shipName: string;
  ending: string;
}

/** Progress that survives prestige resets. */
export interface Profile {
  seniority: number;
  conscience: number;
  contractsCompleted: number;
  deliveries: number;
  endingsSeen: string[];
  history: ContractRecord[];
}

export interface GameState {
  version: number;
  savedAt: number;
  profile: Profile;
  mission: MissionState;
  /** Reserved for the future Boardroom layer. */
  boardroom?: unknown;
}

export const GAME_VERSION = 1;

export function createProfile(): Profile {
  return { seniority: 0, conscience: 0, contractsCompleted: 0, deliveries: 0, endingsSeen: [], history: [] };
}

export function createGame(seed: number, now: number): GameState {
  return {
    version: GAME_VERSION,
    savedAt: now,
    profile: createProfile(),
    mission: createMission(DEFAULT_MISSION_CONFIG, seed),
  };
}

export function tickGame(game: GameState, dt: number): GameState {
  return { ...game, mission: tickMission(game.mission, dt) };
}

export function catchUp(game: GameState, now: number): { game: GameState; elapsed: number } {
  const gap = (now - game.savedAt) / 1000;
  if (gap <= 0) return { game, elapsed: 0 };
  const elapsed = Math.min(gap, OFFLINE_CAP_SECONDS);
  let g = game;
  let remaining = elapsed;
  while (remaining > 0) {
    const step = Math.min(CATCH_UP_STEP_SECONDS, remaining);
    g = tickGame(g, step);
    remaining -= step;
  }
  return { game: { ...g, savedAt: now }, elapsed };
}
