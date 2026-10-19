import { createMission, DEFAULT_MISSION_CONFIG, type MissionOf, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import { appendLog } from '../mission/log';
import { scenarioOf } from '../mission/registry';
import { formatDuration, formatNumber } from './format';

export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 1;
/** Frame gaps longer than this are treated as the player having been away. */
const LIVE_MAX_DT = 2;
const ABSENCE_LOG_THRESHOLD = 60;

/** Compact record of a finished mission, kept forever in the profile. */
export interface ContractRecord {
  scenario: ScenarioId;
  shipName: string;
  ending: string;
  /** The scenario's headline output (ore extracted, units processed, ...). */
  output: number;
  outputUnit: string;
  specimens: number;
  crewSurvived: number;
  duration: number;
}

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
}

/** Progress that survives prestige resets. */
export interface Profile {
  settings: Settings;
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

export const GAME_VERSION = 3;

export function createProfile(): Profile {
  return {
    settings: { sound: false, reducedMotion: false },
    seniority: 0,
    conscience: 0,
    contractsCompleted: 0,
    deliveries: 0,
    endingsSeen: [],
    history: [],
  };
}

/** A brand-new game starts on the default contract: extraction, with the organism horror. */
export function createGame(seed: number, now: number): GameState & { mission: MissionOf<'extraction', 'organism'> } {
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
    const before = scenarioOf(game.mission).outcome(game.mission);
    const after = scenarioOf(g.mission).outcome(g.mission);
    const credits = g.mission.credits - game.mission.credits;
    const yielded = `+${formatNumber(after.output - before.output)} ${after.outputUnit}`;
    const text = `LOW-POWER INTERVAL: ${formatDuration(elapsed)}. AUTOMATED OPS YIELD ${yielded}, +${formatNumber(credits)} CR.`;
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
