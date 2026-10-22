import { createMission, isOutbreak, type MissionConfig, type MissionState, type ScenarioId } from '../mission/state';
import { CREW } from '../data/crew';
import { crewStatus } from '../mission/crew';
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
export const DEFAULT_SAFETY = 5;
const MAX_SAFETY = 10;
/** Incidents at no safety budget, and how much each tenth cuts them. */
const UNSAFE_INCIDENTS = 1.6;
const SAFETY_INCIDENT_CUT = 0.12;
/** Every so many tenths of safety buys each contract another crew berth awake. */
const SAFETY_PER_BERTH = 4;
/** Value per second per running contract, per tenth of safety. */
const SAFETY_RATE = 20;
/** Scrutiny per crew member lost and per contract scuttled; what it fades by each second; where an inquiry opens. */
const DEATH_SCRUTINY = 6;
const SCUTTLE_SCRUTINY = 10;
const SCRUTINY_FADE = 1 / 60;
export const INQUIRY_AT = 100;
const INQUIRY_FINE = 0.2;
const INQUIRY_FREEZE = 600;
const AFTER_INQUIRY = 40;

export type BoardLogKind = 'minutes' | 'memo' | 'ledger';
/** What the Board does with a contract that reaches its terminus. */
export type BoardPolicy = 'deliver' | 'scuttle';

/** A first-tier contract chartered by the Board, run by its own WARDEN instance. */
export interface BoardContract {
  slot: number;
  mission: MissionState;
  taps: number;
  decideIn: number;
  /** Crew already counted as lost, so each death raises scrutiny once. */
  lost: number;
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
  /** Tenths of the safety budget, applied to every running contract. */
  safety: number;
  scrutiny: number;
  inquiries: number;
  /** Seconds left on an inquiry's freeze on new charters. */
  frozenFor: number;
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
    safety: DEFAULT_SAFETY,
    scrutiny: 0,
    inquiries: 0,
    frozenFor: 0,
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
  if (slot === null || b.value < cost || b.frozenFor > 0) return game;
  const config = safeConfig({ ...missionConfigFor(game.profile, scenario), horror: horrorFor(game.profile, scenario, seed) }, game, b.safety);
  const contract: BoardContract = { slot, mission: createMission(config, seed), taps: 0, decideIn: 0, lost: 0 };
  return { ...game, boardroom: { ...b, value: b.value - cost, contracts: [...b.contracts, contract] } };
}

/** A contract's config under the Board's safety budget: incidents scaled, berths added, on top of the profile's own. */
function safeConfig<C extends MissionConfig>(config: C, game: GameState, safety: number): C {
  const base = missionConfigFor(game.profile, config.scenario);
  return {
    ...config,
    incidentMultiplier: base.incidentMultiplier * (UNSAFE_INCIDENTS - SAFETY_INCIDENT_CUT * safety),
    extraLifeSupport: base.extraLifeSupport + Math.floor(safety / SAFETY_PER_BERTH),
  };
}

export function shiftSafety(game: GameState, step: 1 | -1): GameState {
  const b = game.boardroom;
  if (!b) return game;
  const safety = Math.max(0, Math.min(MAX_SAFETY, b.safety + step));
  if (safety === b.safety) return game;
  const contracts = b.contracts.map((c) => ({ ...c, mission: { ...c.mission, config: safeConfig(c.mission.config, game, safety) } }));
  return { ...game, boardroom: { ...b, safety, contracts } };
}

export const safetyCost = (b: BoardroomState): number => SAFETY_RATE * b.safety * b.contracts.length;

const lostCrew = (m: MissionState) => CREW.filter((c) => crewStatus(m, c.id) === 'lost').length;

/** Scrutiny past the line: a fine, a freeze on charters, and the matter minuted. */
function inquiry(b: BoardroomState): BoardroomState {
  const fine = b.value * INQUIRY_FINE;
  const next = { ...b, value: b.value - fine, scrutiny: AFTER_INQUIRY, inquiries: b.inquiries + 1, frozenFor: INQUIRY_FREEZE };
  return appendLog<BoardLogKind, BoardroomState>(next, 'memo', `INQUIRY OPENED INTO CREW LOSSES. SETTLEMENT ₭${formatNumber(fine)}. NEW CHARTERS SUSPENDED PENDING REVIEW.`);
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
    scrutiny: b.scrutiny + (b.policy === 'scuttle' ? SCUTTLE_SCRUTINY : 0),
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
  let deaths = 0;
  const contracts = b.contracts.map((c) => {
    const defended = defendMission(c, dt);
    const mission = tickMission(defended.mission, dt, ctx);
    const lost = lostCrew(mission);
    deaths += Math.max(0, lost - c.lost);
    return { ...defended, mission, lost };
  });
  let next: BoardroomState = {
    ...b,
    elapsed: b.elapsed + dt,
    contracts,
    value: Math.max(0, b.value - safetyCost(b) * dt),
    scrutiny: Math.max(0, b.scrutiny + deaths * DEATH_SCRUTINY - SCRUTINY_FADE * dt),
    frozenFor: Math.max(0, b.frozenFor - dt),
  };
  for (const c of contracts) if (c.mission.flags.includes('terminus')) next = close(next, c);
  if (next.scrutiny >= INQUIRY_AT) next = inquiry(next);
  return { ...game, boardroom: next };
}
