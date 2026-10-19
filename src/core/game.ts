import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../mission/state';
import { tickMission } from '../mission/tick';
import { appendLog } from '../mission/log';
import { formatDuration, formatNumber } from './format';

export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 1;
/** Frame gaps longer than this are treated as the player having been away. */
const LIVE_MAX_DT = 2;
const ABSENCE_LOG_THRESHOLD = 60;

/** Compact record of a finished mission, kept forever in the profile. */
export interface ContractRecord {
  shipName: string;
  ending: string;
  lifetimeOre: number;
  specimens: number;
  crewSurvived: number;
  duration: number;
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
  const ctx = { cycle: game.profile.contractsCompleted, endings: game.profile.endingsSeen };
  return { ...game, mission: tickMission(game.mission, dt, ctx) };
}

function simulate(game: GameState, seconds: number): GameState {
  let g = game;
  let remaining = seconds;
  while (remaining > 0) {
    const step = Math.min(CATCH_UP_STEP_SECONDS, remaining);
    g = tickGame(g, step);
    remaining -= step;
  }
  return g;
}

function simulateAbsence(game: GameState, gapSeconds: number): { game: GameState; elapsed: number } {
  const elapsed = Math.min(gapSeconds, OFFLINE_CAP_SECONDS);
  let g = simulate(game, elapsed);
  if (elapsed >= ABSENCE_LOG_THRESHOLD) {
    const ore = g.mission.lifetimeOre - game.mission.lifetimeOre;
    const credits = g.mission.credits - game.mission.credits;
    const text = `LOW-POWER INTERVAL: ${formatDuration(elapsed)}. AUTOMATED OPS YIELD +${formatNumber(ore)} ORE, +${formatNumber(credits)} CR.`;
    g = { ...g, mission: appendLog(g.mission, 'sys', text) };
  }
  return { game: g, elapsed };
}

/** Called on load: simulate the time since the last save. */
export function catchUp(game: GameState, now: number): { game: GameState; elapsed: number } {
  const gap = (now - game.savedAt) / 1000;
  if (gap <= 0) return { game, elapsed: 0 };
  const result = simulateAbsence(game, gap);
  return { game: { ...result.game, savedAt: now }, elapsed: result.elapsed };
}

/** Called by the live loop with real elapsed time since the previous frame. */
export function advance(game: GameState, dt: number): { game: GameState; offlineSeconds: number } {
  if (dt <= LIVE_MAX_DT) return { game: tickGame(game, dt), offlineSeconds: 0 };
  const { game: g, elapsed } = simulateAbsence(game, dt);
  return { game: g, offlineSeconds: elapsed };
}
