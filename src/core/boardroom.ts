import { createMission, isOutbreak, type MissionConfig, type MissionState, type ScenarioId } from '../mission/state';
import { CREW } from '../data/crew';
import { DIVISIONS, type Division, type DivisionId } from '../data/boardroom/divisions';
import { nextRandom } from '../engine/rng';
import { crewStatus } from '../mission/crew';
import { tickMission } from '../mission/tick';
import { appendLog, type LogEntry } from '../engine/log';
import { formatNumber } from '../engine/format';
import { defendMission } from '../sim/bot';
import type { ContractRecord, GameState } from './game';
import { runBoardStory } from './boardroom-story';
import { availableAssignments, horrorFor, isBoardroomUnlocked, missionConfigFor, missionRecord } from './prestige';

/** The Boardroom (docs/BOARDROOM.md): WARDEN promoted to Kessler-Amari headquarters, running contracts in parallel. */
export const START_VALUE = 5e6;
const START_SLOTS = 1;
export const MAX_SLOTS = 6;
const CHARTER = 2e6;
/** A delivered contract returns its charter this many times over, plus what Special Projects and Bioproducts pay. */
const DELIVERY_RETURN = 2.5;
const SPECIMEN_VALUE = 2e4;
const SAMPLE_VALUE = 2e4;
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
/** What each division level does. */
const PERSONNEL_DISCOUNT = 0.85;
const LEGAL_SOFTENING = 0.8;
const PRODUCT_BONUS = 0.5;
const LOGISTICS_SPEED = 0.5;
/** Contract seconds per Board second: what a player runs in hours, the Board runs in minutes. */
export const BOARD_SPEED = 5;
/**
 * The Board's calendar: contracts are years-long hauls (eleven years home from Tethys Minor), so one Board minute is a
 * fiscal quarter, and a contract delivered in about three quarters of an hour has been out about eleven years.
 */
const SECONDS_PER_QUARTER = 60;
const QUARTERS_PER_YEAR = 4;

export const boardYears = (seconds: number): number => Math.floor(seconds / (SECONDS_PER_QUARTER * QUARTERS_PER_YEAR));

export function boardDate(seconds: number): string {
  const quarter = Math.floor(seconds / SECONDS_PER_QUARTER) % QUARTERS_PER_YEAR;
  return `Q${quarter + 1} · YEAR ${boardYears(seconds) + 1}`;
}

/** Years a contract has been out, in Board time (its own clock runs faster than the Board's). */
export const contractYears = (c: BoardContract): number => boardYears(c.mission.elapsed / BOARD_SPEED);
/** Each Dividend: this much more starting value, and this much more on every delivery, in later terms. */
const DIVIDEND_START = 0.5;
const DIVIDEND_PAY = 0.25;
/** Conscience for testifying, and for releasing the minutes; the terms a board needs behind it before it may release them. */
export const TESTIFY_CONSCIENCE = 3;
const RELEASE_CONSCIENCE = 5;
export const RELEASE_AFTER_TERMS = 2;

export type TermEnding = 'chair' | 'testify' | 'release';

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
  divisions: Partial<Record<DivisionId, number>>;
  ledger: ContractRecord[];
  act: number;
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
  log: LogEntry<BoardLogKind>[];
  nextLogId: number;
}

export function createBoardroom(seed: number, term = 1, dividends = 0): BoardroomState {
  return {
    term,
    rng: seed,
    elapsed: 0,
    value: START_VALUE * (1 + DIVIDEND_START * dividends),
    lifetimeValue: 0,
    slots: START_SLOTS,
    contracts: [],
    policy: 'deliver',
    safety: DEFAULT_SAFETY,
    scrutiny: 0,
    inquiries: 0,
    frozenFor: 0,
    divisions: {},
    ledger: [],
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
    log: [],
    nextLogId: 1,
  };
}

const level = (b: BoardroomState, id: DivisionId) => b.divisions[id] ?? 0;

export const charterCost = (b: BoardroomState, _scenario: ScenarioId): number => Math.ceil(CHARTER * PERSONNEL_DISCOUNT ** level(b, 'personnel'));

export const divisionCost = (d: Division, owned: number): number => Math.ceil(d.cost * d.growth ** owned);

export function buyDivision(game: GameState, id: DivisionId): GameState {
  const b = game.boardroom;
  const d = DIVISIONS.find((x) => x.id === id);
  if (!b || !d) return game;
  const owned = level(b, id);
  const cost = divisionCost(d, owned);
  if (owned >= d.max || b.value < cost) return game;
  return { ...game, boardroom: { ...b, value: b.value - cost, divisions: { ...b.divisions, [id]: owned + 1 } } };
}

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
  return { ...game, mode: 'boardroom', boardroom: createBoardroom(seed, game.profile.boardTerms + 1, game.profile.dividends) };
}

export const leaveBoardroom = (game: GameState): GameState => ({ ...game, mode: 'mission' });

export function commission(game: GameState, scenario: ScenarioId, seed: number): GameState {
  const b = game.boardroom;
  if (!b || !charterable(game).includes(scenario)) return game;
  const slot = freeSlot(b);
  const cost = charterCost(b, scenario);
  if (slot === null || b.value < cost || b.frozenFor > 0) return game;
  // The draw's "not three in a row" reads the Board's own charters too, delivered and running, not just the player's.
  const running = b.contracts.map((c) => missionRecord(c.mission, 'running'));
  const record = { ...game.profile, history: [...game.profile.history, ...b.ledger, ...running] };
  const config = safeConfig({ ...missionConfigFor(game.profile, scenario), horror: horrorFor(record, scenario, seed) }, game, b.safety);
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

/** The contract that has paid best per second on the ledger; extraction until there is a ledger to read. */
function bestContract(game: GameState): ScenarioId {
  const open = charterable(game);
  const rated = (game.boardroom?.ledger ?? []).filter((r) => r.ending === 'deliver' && open.includes(r.scenario));
  if (rated.length === 0) return open.includes('extraction') ? 'extraction' : open[0]!;
  return rated.reduce((a, r) => (r.output / Math.max(1, r.duration) > a.output / Math.max(1, a.duration) ? r : a)).scenario;
}

/** The COO fills every free office, while the money and the regulators allow. */
function recharter(game: GameState): GameState {
  let g = game;
  while (g.boardroom && freeSlot(g.boardroom) !== null) {
    const [roll, rng] = nextRandom(g.boardroom.rng);
    const next = commission({ ...g, boardroom: { ...g.boardroom, rng } }, bestContract(g), Math.floor(roll * 2 ** 31));
    if (next.boardroom!.contracts.length === g.boardroom.contracts.length) return g;
    g = next;
  }
  return g;
}

/** A Board with nothing running and too little to charter could never earn again: the treasury advances one charter. */
function advanceCharter(b: BoardroomState): BoardroomState {
  const cost = charterCost(b, 'extraction');
  if (b.contracts.length > 0 || b.value >= cost) return b;
  return appendLog<BoardLogKind, BoardroomState>({ ...b, value: cost }, 'memo', `TREASURY: A CHARTER ADVANCED AGAINST NEXT QUARTER. ₭${formatNumber(cost - b.value)}.`);
}

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
export function deliveryValue(m: MissionState, policy: BoardPolicy, b: BoardroomState, profile?: { dividends: number }): number {
  if (policy === 'scuttle') return CHARTER * SCUTTLE_RETURN;
  const dividend = 1 + DIVIDEND_PAY * (profile?.dividends ?? 0);
  const specimens = missionRecord(m, policy).specimens * SPECIMEN_VALUE * (1 + PRODUCT_BONUS * level(b, 'specialProjects'));
  const samples = (isOutbreak(m) ? Math.floor(m.samples) : 0) * SAMPLE_VALUE * (1 + PRODUCT_BONUS * level(b, 'bioproducts'));
  return (CHARTER * DELIVERY_RETURN + specimens + samples) * dividend;
}

/** The endings a finished term offers; releasing the minutes takes a board with terms behind it. */
export function termEndings(game: GameState): TermEnding[] {
  if (!game.boardroom?.flags.includes('term-end')) return [];
  return game.profile.boardTerms >= RELEASE_AFTER_TERMS ? ['chair', 'testify', 'release'] : ['chair', 'testify'];
}

/** The term ends: the profile remembers how, and a new term opens. The player's own contract is untouched. */
export function endTerm(game: GameState, ending: TermEnding, seed: number): GameState {
  if (!termEndings(game).includes(ending)) return game;
  const p = game.profile;
  const profile = {
    ...p,
    boardTerms: p.boardTerms + 1,
    dividends: p.dividends + (ending === 'chair' ? 1 : 0),
    conscience: p.conscience + (ending === 'testify' ? TESTIFY_CONSCIENCE : ending === 'release' ? RELEASE_CONSCIENCE : 0),
    endingsSeen: p.endingsSeen.includes(ending) ? p.endingsSeen : [...p.endingsSeen, ending],
  };
  return { ...game, profile, boardroom: createBoardroom(seed, profile.boardTerms + 1, profile.dividends) };
}

/** A contract at its terminus is closed by the standing policy: paid, put in the ledger, its office freed. */
function close(b: BoardroomState, c: BoardContract, profile: { dividends: number }): BoardroomState {
  const paid = deliveryValue(c.mission, b.policy, b, profile);
  const verb = b.policy === 'deliver' ? 'DELIVERED' : 'SCUTTLED';
  const next = {
    ...b,
    scrutiny: b.scrutiny + (b.policy === 'scuttle' ? SCUTTLE_SCRUTINY * LEGAL_SOFTENING ** level(b, 'legal') : 0),
    value: b.value + paid,
    lifetimeValue: b.lifetimeValue + paid,
    contracts: b.contracts.filter((x) => x !== c),
    ledger: [...b.ledger, missionRecord(c.mission, b.policy)],
  };
  return appendLog<BoardLogKind, BoardroomState>(next, 'ledger', `${c.mission.config.shipName.toUpperCase()} ${verb} AFTER ${contractYears(c)} YEARS. +₭${formatNumber(paid)}.`);
}

export function tickBoardroom(game: GameState, dt: number): GameState {
  const b = game.boardroom;
  if (!b) return game;
  const ctx = { cycle: game.profile.contractsCompleted, endings: game.profile.endingsSeen };
  let deaths = 0;
  // Logistics runs every contract faster than the Boardroom's own clock.
  const step = dt * BOARD_SPEED * (1 + LOGISTICS_SPEED * level(b, 'logistics'));
  const contracts = b.contracts.map((c) => {
    const defended = defendMission(c, step);
    const mission = tickMission(defended.mission, step, ctx);
    const lost = lostCrew(mission);
    deaths += Math.max(0, lost - c.lost);
    return { ...defended, mission, lost };
  });
  let next: BoardroomState = {
    ...b,
    elapsed: b.elapsed + dt,
    contracts,
    value: Math.max(0, b.value - safetyCost(b) * dt),
    scrutiny: Math.max(0, b.scrutiny + deaths * DEATH_SCRUTINY * LEGAL_SOFTENING ** level(b, 'legal') - SCRUTINY_FADE * dt),
    frozenFor: Math.max(0, b.frozenFor - dt),
  };
  for (const c of contracts) if (c.mission.flags.includes('terminus')) next = close(next, c, game.profile);
  if (next.scrutiny >= INQUIRY_AT) next = inquiry(next);
  next = advanceCharter(next);
  next = runBoardStory(next, game);
  let after: GameState = { ...game, boardroom: next };
  if (level(next, 'coo') > 0) after = recharter(after);
  return after;
}
