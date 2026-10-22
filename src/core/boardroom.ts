import { createMission, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import type { LogEntry } from '../shared/log';
import { defendMission } from '../sim/bot';
import type { ContractRecord, GameState } from './game';
import { availableAssignments, horrorFor, isBoardroomUnlocked, missionConfigFor } from './prestige';

/** The Boardroom (docs/BOARDROOM.md): WARDEN promoted to Kessler-Amari headquarters, running contracts in parallel. */
export const START_VALUE = 5e6;
const START_SLOTS = 1;
const CHARTER = 2e6;

export type BoardLogKind = 'minutes' | 'memo' | 'ledger';

/** A first-tier contract chartered by the Board, run by its own WARDEN instance. */
export interface BoardContract {
  slot: number;
  mission: MissionState;
  taps: number;
  decideIn: number;
}

export interface BoardroomState {
  term: number;
  rng: number;
  elapsed: number;
  value: number;
  lifetimeValue: number;
  slots: number;
  contracts: BoardContract[];
  ledger: ContractRecord[];
  act: number;
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
  log: LogEntry<BoardLogKind>[];
  nextLogId: number;
}

export function createBoardroom(seed: number, term = 1): BoardroomState {
  return {
    term,
    rng: seed,
    elapsed: 0,
    value: START_VALUE,
    lifetimeValue: 0,
    slots: START_SLOTS,
    contracts: [],
    ledger: [],
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
    log: [],
    nextLogId: 1,
  };
}

export const charterCost = (_b: BoardroomState, _scenario: ScenarioId): number => CHARTER;

/** The lowest-numbered office with no contract in it, or null when every office is busy. */
export function freeSlot(b: BoardroomState): number | null {
  for (let slot = 0; slot < b.slots; slot++) if (!b.contracts.some((c) => c.slot === slot)) return slot;
  return null;
}

/** Contracts the Board may charter: whatever the player has unlocked, except the road to the lift. */
export const charterable = (game: GameState): ScenarioId[] => availableAssignments(game.profile).filter((s) => s !== 'overland');

export function enterBoardroom(game: GameState, seed: number): GameState {
  if (game.boardroom) return { ...game, mode: 'boardroom' };
  if (!isBoardroomUnlocked(game.profile)) return game;
  return { ...game, mode: 'boardroom', boardroom: createBoardroom(seed) };
}

export const leaveBoardroom = (game: GameState): GameState => ({ ...game, mode: 'mission' });

export function commission(game: GameState, scenario: ScenarioId, seed: number): GameState {
  const b = game.boardroom;
  if (!b || !charterable(game).includes(scenario)) return game;
  const slot = freeSlot(b);
  const cost = charterCost(b, scenario);
  if (slot === null || b.value < cost) return game;
  const config = { ...missionConfigFor(game.profile, scenario), horror: horrorFor(game.profile, scenario, seed) };
  const contract: BoardContract = { slot, mission: createMission(config, seed), taps: 0, decideIn: 0 };
  return { ...game, boardroom: { ...b, value: b.value - cost, contracts: [...b.contracts, contract] } };
}

export function tickBoardroom(game: GameState, dt: number): GameState {
  const b = game.boardroom;
  if (!b) return game;
  const ctx = { cycle: game.profile.contractsCompleted, endings: game.profile.endingsSeen };
  const contracts = b.contracts.map((c) => {
    const defended = defendMission(c, dt);
    return { ...defended, mission: tickMission(defended.mission, dt, ctx) };
  });
  return { ...game, boardroom: { ...b, elapsed: b.elapsed + dt, contracts } };
}
