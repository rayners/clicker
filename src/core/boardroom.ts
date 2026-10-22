import { createMission, isOutbreak, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import { appendLog, type LogEntry } from '../shared/log';
import { formatNumber } from '../shared/format';
import { defendMission } from '../sim/bot';
import type { ContractRecord, GameState } from './game';
import { availableAssignments, horrorFor, isBoardroomUnlocked, missionConfigFor, missionRecord } from './prestige';

/** The Boardroom (docs/BOARDROOM.md): WARDEN promoted to Kessler-Amari headquarters, running contracts in parallel. */
export const START_VALUE = 5e6;
const START_SLOTS = 1;
export const MAX_SLOTS = 6;
const CHARTER = 2e6;
/** A delivered contract returns its charter this many times over, plus what Special Projects and Bioproducts pay. */
const DELIVERY_RETURN = 2.5;
const SPECIMEN_VALUE = 2e5;
const SAMPLE_VALUE = 1e5;
/** A scuttled contract: the insurance, more or less. */
const SCUTTLE_RETURN = 0.2;
const FLOOR_BASE = 5e6;
const FLOOR_GROWTH = 3;

export type BoardLogKind = 'minutes' | 'memo' | 'ledger';
/** What the Board does with a contract that reaches its terminus. */
export type BoardPolicy = 'deliver' | 'scuttle';

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
  policy: BoardPolicy;
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
    policy: 'deliver',
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

export const floorCost = (b: BoardroomState): number => Math.ceil(FLOOR_BASE * FLOOR_GROWTH ** (b.slots - START_SLOTS));

export function buyFloor(game: GameState): GameState {
  const b = game.boardroom;
  if (!b || b.slots >= MAX_SLOTS || b.value < floorCost(b)) return game;
  return { ...game, boardroom: { ...b, value: b.value - floorCost(b), slots: b.slots + 1 } };
}

export const setPolicy = (game: GameState, policy: BoardPolicy): GameState => (game.boardroom ? { ...game, boardroom: { ...game.boardroom, policy } } : game);

/** What a finished contract pays the Board under each policy. */
export function deliveryValue(m: MissionState, policy: BoardPolicy): number {
  if (policy === 'scuttle') return CHARTER * SCUTTLE_RETURN;
  const record = missionRecord(m, policy);
  return CHARTER * DELIVERY_RETURN + record.specimens * SPECIMEN_VALUE + (isOutbreak(m) ? Math.floor(m.samples) * SAMPLE_VALUE : 0);
}

/** A contract at its terminus is closed by the standing policy: paid, put in the ledger, its office freed. */
function close(b: BoardroomState, c: BoardContract): BoardroomState {
  const paid = deliveryValue(c.mission, b.policy);
  const verb = b.policy === 'deliver' ? 'DELIVERED' : 'SCUTTLED';
  const next = {
    ...b,
    value: b.value + paid,
    lifetimeValue: b.lifetimeValue + paid,
    contracts: b.contracts.filter((x) => x !== c),
    ledger: [...b.ledger, missionRecord(c.mission, b.policy)],
  };
  return appendLog<BoardLogKind, BoardroomState>(next, 'ledger', `${c.mission.config.shipName.toUpperCase()} ${verb}. +₭${formatNumber(paid)}.`);
}

export function tickBoardroom(game: GameState, dt: number): GameState {
  const b = game.boardroom;
  if (!b) return game;
  const ctx = { cycle: game.profile.contractsCompleted, endings: game.profile.endingsSeen };
  const contracts = b.contracts.map((c) => {
    const defended = defendMission(c, dt);
    return { ...defended, mission: tickMission(defended.mission, dt, ctx) };
  });
  let next: BoardroomState = { ...b, elapsed: b.elapsed + dt, contracts };
  for (const c of contracts) if (c.mission.flags.includes('terminus')) next = close(next, c);
  return { ...game, boardroom: next };
}
