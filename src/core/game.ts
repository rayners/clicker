import { createMission, DEFAULT_MISSION_CONFIG, type MissionOf, type HorrorId, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import { appendLog } from '../mission/log';
import { scenarioOf } from '../mission/registry';
import { formatDuration, formatNumber } from '../engine/format';
import { tickCreature, type CreatureHunt } from './creature';
import { tickHunter, type HunterHunt } from './hunter';
import { tickBoardroom, type BoardroomState } from './boardroom';

export const OFFLINE_CAP_SECONDS = 8 * 3600;
const CATCH_UP_STEP_SECONDS = 5;
/** Frame gaps longer than this are treated as the player having been away. */
const LIVE_MAX_DT = 2;
const ABSENCE_LOG_THRESHOLD = 60;

/** Compact record of a finished mission, kept forever in the profile. */
export interface ContractRecord {
  scenario: ScenarioId;
  horror: HorrorId;
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
  /** Legend each horror has carried out of finished hunts (see docs/HORROR-TIER.md). */
  legend: Record<string, number>;
  /** Boardroom terms completed, and Dividends earned by chairing the Board (docs/BOARDROOM.md). */
  boardTerms: number;
  dividends: number;
}

/** A new player, a finished contract, or a mid-contract request (the only one that can be cancelled). */
export type AssignmentReason = 'start' | 'renewal' | 'reassign';

export interface GameState {
  version: number;
  savedAt: number;
  profile: Profile;
  mission: MissionState;
  /** Waiting for the player to pick the next contract, and why; nothing runs meanwhile. */
  assigning: false | AssignmentReason;
  /** Which side is open: the player's own contract, Special Order 0-77 (the creature), or the hunt (the hunter). */
  mode: 'mission' | 'creature' | 'hunter' | 'boardroom';
  /** The creature's hunt, once accepted; kept while the player is back on their contract. */
  creature: CreatureHunt | null;
  /** The hunter's, likewise. */
  hunter: HunterHunt | null;
  /** Reserved for the future Boardroom layer. */
  /** The second tier, once promoted (docs/BOARDROOM.md); kept while the player is back on their contract. */
  boardroom: BoardroomState | null;
}

export const GAME_VERSION = 11;

export function createProfile(): Profile {
  return {
    settings: { sound: false, reducedMotion: false },
    seniority: 0,
    conscience: 0,
    contractsCompleted: 0,
    deliveries: 0,
    endingsSeen: [],
    history: [],
    legend: {},
    boardTerms: 0,
    dividends: 0,
  };
}

/** A brand-new game starts on the default contract: extraction, with the organism horror. */
export function createGame(seed: number, now: number): GameState & { mission: MissionOf<'extraction', 'organism'> } {
  return {
    version: GAME_VERSION,
    savedAt: now,
    profile: createProfile(),
    mission: createMission(DEFAULT_MISSION_CONFIG, seed),
    assigning: false,
    mode: 'mission',
    creature: null,
    hunter: null,
    boardroom: null,
  };
}

/** A brand-new player: the first thing they do is choose a contract. */
export function newGame(seed: number, now: number): GameState {
  return { ...createGame(seed, now), assigning: 'start' };
}

export function tickGame(game: GameState, dt: number): GameState {
  if (game.mode === 'creature') return tickCreature(game, dt);
  if (game.mode === 'hunter') return tickHunter(game, dt);
  if (game.mode === 'boardroom') return tickBoardroom(game, dt);
  if (game.assigning) return game;
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
  if (game.assigning && game.mode === 'mission') return { game, elapsed: 0 };
  const elapsed = Math.min(gapSeconds, OFFLINE_CAP_SECONDS);
  let g = simulate(game, elapsed);
  if (elapsed >= ABSENCE_LOG_THRESHOLD && game.mode === 'mission') {
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
  // A clock set back (or corrected by the network) gives a negative gap: time does not run in reverse.
  if (!(dt > 0)) return { game, offlineSeconds: 0 };
  if (dt <= LIVE_MAX_DT) return { game: tickGame(game, dt), offlineSeconds: 0 };
  const { game: g, elapsed } = simulateAbsence(game, dt);
  return { game: g, offlineSeconds: elapsed };
}
