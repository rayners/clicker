import { createMission, DEFAULT_MISSION_CONFIG, type MissionOf, type HorrorId, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import { appendLog } from '../mission/log';
import { scenarioOf } from '../mission/registry';
import { formatDuration, formatNumber } from '../engine/format';
import { createClock } from '../engine/clock';
import { tickCreature, type CreatureHunt } from './creature';
import { tickHunter, type HunterHunt } from './hunter';
import { tickBoardroom, type BoardroomState } from './boardroom';

const CATCH_UP_STEP_SECONDS = 5;
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

const clock = createClock<GameState>({
  tick: tickGame,
  step: CATCH_UP_STEP_SECONDS,
  // Waiting on the contract choice: nothing runs until one is accepted.
  paused: (game) => !!game.assigning && game.mode === 'mission',
  noteAway(before, after, seconds) {
    if (seconds < ABSENCE_LOG_THRESHOLD || before.mode !== 'mission') return after;
    const was = scenarioOf(before.mission).outcome(before.mission);
    const now = scenarioOf(after.mission).outcome(after.mission);
    const credits = after.mission.credits - before.mission.credits;
    const yielded = `+${formatNumber(now.output - was.output)} ${now.outputUnit}`;
    const text = `LOW-POWER INTERVAL: ${formatDuration(seconds)}. AUTOMATED OPS YIELD ${yielded}, +${formatNumber(credits)} CR.`;
    return { ...after, mission: appendLog(after.mission, 'sys', text) };
  },
});

/** Called on load: simulate the time since the last save. */
export const catchUp = clock.catchUp;

/** Called by the live loop with real elapsed time since the previous frame. */
export const advance = clock.advance;
