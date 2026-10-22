import { describe, it, expect } from 'vitest';
import { createGame, GAME_VERSION, tickGame, type GameState } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { BOARDROOM_UNLOCK_CONTRACTS } from '../../src/core/prestige';
import { charterCost, commission, createBoardroom, DEFAULT_SAFETY, deliveryValue, divisionCost, floorCost, freeSlot, INQUIRY_AT, MAX_SLOTS, safetyCost, START_VALUE } from '../../src/core/boardroom';
import { DIVISIONS } from '../../src/data/boardroom/divisions';
import { createMission, type ScenarioId } from '../../src/mission/state';
import { missionConfigFor } from '../../src/core/prestige';
import { deserialize, serialize } from '../../src/core/save';
import { applyScenario } from '../../src/core/debug';
import { veteran } from '../helpers';

const NOW = 1_000;
const promoted = (): GameState => reduce(veteran(createGame(1, NOW)), { type: 'enterBoardroom', seed: 9 });
const board = (g: GameState) => g.boardroom!;
const createMissionFor = (scenario: ScenarioId) => createMission(missionConfigFor(createGame(1, NOW).profile, scenario), 1);

describe('the Boardroom: the layer', () => {
  it('stays shut until enough contracts are completed', () => {
    const g = { ...createGame(1, NOW), profile: { ...createGame(1, NOW).profile, contractsCompleted: BOARDROOM_UNLOCK_CONTRACTS - 1 } };
    expect(reduce(g, { type: 'enterBoardroom', seed: 9 })).toBe(g);
  });

  it('opens a term on promotion, keeping the player\'s own contract waiting', () => {
    const before = veteran(createGame(1, NOW));
    const g = reduce(before, { type: 'enterBoardroom', seed: 9 });
    expect(g.mode).toBe('boardroom');
    expect(board(g)).toMatchObject({ term: 1, value: START_VALUE, slots: 1, contracts: [] });
    expect(g.mission).toBe(before.mission);
    const back = reduce(g, { type: 'leaveBoardroom' });
    expect(back.mode).toBe('mission');
    expect(reduce(back, { type: 'enterBoardroom', seed: 1 }).boardroom).toBe(back.boardroom);
  });

  it('only passes the Boardroom\'s time while it is open', () => {
    const g = promoted();
    const ticked = tickGame(g, 10);
    expect(ticked.mission).toBe(g.mission);
    expect(board(ticked).elapsed).toBe(10);
  });
});

describe('the Boardroom: commissioning contracts', () => {
  it('charters a real contract into a free office, paid from value, with the horror drawn for it', () => {
    const g = reduce(promoted(), { type: 'commission', scenario: 'extraction', seed: 4 });
    const b = board(g);
    expect(b.contracts).toHaveLength(1);
    expect(b.contracts[0]!.slot).toBe(0);
    expect(b.contracts[0]!.mission.scenario).toBe('extraction');
    expect(['organism', 'outbreak']).toContain(b.contracts[0]!.mission.horror);
    expect(b.value).toBe(START_VALUE - charterCost(createBoardroom(9), 'extraction'));
  });

  it('refuses a contract with no free office, no money, or of a kind not yet unlocked, and never the overland haul', () => {
    const g = reduce(promoted(), { type: 'commission', scenario: 'extraction', seed: 4 });
    expect(freeSlot(board(g))).toBeNull();
    expect(reduce(g, { type: 'commission', scenario: 'terraform', seed: 5 })).toBe(g);
    const broke = { ...promoted(), boardroom: { ...board(promoted()), value: 0 } };
    expect(reduce(broke, { type: 'commission', scenario: 'extraction', seed: 5 })).toBe(broke);
    const raw = promoted();
    expect(reduce(raw, { type: 'commission', scenario: 'overland', seed: 5 })).toBe(raw);
    const junior = { ...raw, profile: { ...raw.profile, contractsCompleted: BOARDROOM_UNLOCK_CONTRACTS, history: [] } };
    expect(commission(junior, 'salvage', 5)).not.toBe(junior);
  });

  it('runs each chartered contract headless under its own WARDEN while the Boardroom is open', () => {
    let g = reduce(promoted(), { type: 'commission', scenario: 'extraction', seed: 4 });
    for (let i = 0; i < 600; i++) g = tickGame(g, 1);
    const m = board(g).contracts[0]!.mission;
    expect(m.elapsed).toBe(600);
    expect(m.lifetimeCredits).toBeGreaterThan(0);
    expect(m.upgrades.length + Object.values((m as never as { generators: Record<string, number> }).generators).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});

describe('the Boardroom: saves and testing', () => {
  it('keeps the Boardroom in the save, and gives older saves none (v10)', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(10);
    const g = reduce(promoted(), { type: 'commission', scenario: 'extraction', seed: 4 });
    expect(deserialize(serialize(g)).boardroom).toEqual(g.boardroom);
    const v9 = JSON.parse(serialize(createGame(1, NOW)));
    v9.version = 9;
    delete v9.boardroom;
    expect(deserialize(JSON.stringify(v9)).boardroom).toBeNull();
  });

  it('has a debug jump straight into the Boardroom', () => {
    const g = applyScenario(createGame(1, NOW), 'boardroom');
    expect(g.mode).toBe('boardroom');
    expect(g.boardroom).not.toBeNull();
  });
});

describe('the Boardroom: delivery', () => {
  const finished = (policy?: 'deliver' | 'scuttle') => {
    const g = reduce(promoted(), { type: 'commission', scenario: 'extraction', seed: 4 });
    const b = board(g);
    const c = b.contracts[0]!;
    const done = { ...c, mission: { ...c.mission, flags: [...c.mission.flags, 'terminus'], elapsed: 4 * 3600 } };
    return { ...g, boardroom: { ...b, contracts: [done], ...(policy ? { policy } : {}) } };
  };

  it('delivers a finished contract by the standing policy: value paid, a ledger line, the office freed', () => {
    const g = finished();
    expect(board(g).policy).toBe('deliver');
    const after = tickGame(g, 1);
    const b = board(after);
    expect(b.contracts).toHaveLength(0);
    expect(b.ledger).toHaveLength(1);
    expect(b.ledger[0]).toMatchObject({ scenario: 'extraction', ending: 'deliver' });
    expect(b.value).toBeGreaterThan(board(g).value);
    expect(b.value - board(g).value).toBeCloseTo(b.lifetimeValue - safetyCost(board(g)));
    expect(b.log.at(-1)!.text).toMatch(/DELIVERED/);
    expect(freeSlot(b)).toBe(0);
  });

  it('pays far less for a scuttled contract, and leaves the player\'s own record alone', () => {
    const delivered = board(tickGame(finished('deliver'), 1)).lifetimeValue;
    const scuttledGame = tickGame(finished('scuttle'), 1);
    expect(board(scuttledGame).lifetimeValue).toBeLessThan(delivered / 5);
    expect(board(scuttledGame).ledger[0]!.ending).toBe('scuttle');
    expect(scuttledGame.profile.history).toEqual(finished().profile.history);
  });

  it('sets the standing policy from the store', () => {
    expect(board(reduce(promoted(), { type: 'setPolicy', policy: 'scuttle' })).policy).toBe('scuttle');
  });

  it('buys floors for more offices, each dearer, up to the top of the tower', () => {
    const rich = { ...promoted(), boardroom: { ...board(promoted()), value: 1e12 } };
    const one = reduce(rich, { type: 'buyFloor' });
    expect(board(one).slots).toBe(2);
    expect(board(one).value).toBe(1e12 - floorCost(board(rich)));
    expect(floorCost(board(one))).toBeGreaterThan(floorCost(board(rich)));
    let top: GameState = rich;
    for (let i = 0; i < 20; i++) top = reduce(top, { type: 'buyFloor' });
    expect(board(top).slots).toBe(MAX_SLOTS);
  });
});

describe('the Boardroom: safety and scrutiny', () => {
  const chartered = () => reduce(promoted(), { type: 'commission', scenario: 'extraction', seed: 4 });

  it('runs a safety budget dial, applied to every running contract: fewer incidents and more life support the higher it goes', () => {
    const g = chartered();
    expect(board(g).safety).toBe(DEFAULT_SAFETY);
    const low = reduce(reduce(g, { type: 'shiftSafety', step: -1 }), { type: 'shiftSafety', step: -1 });
    const high = reduce(g, { type: 'shiftSafety', step: 1 });
    expect(board(low).contracts[0]!.mission.config.incidentMultiplier).toBeGreaterThan(board(g).contracts[0]!.mission.config.incidentMultiplier);
    expect(board(high).contracts[0]!.mission.config.incidentMultiplier).toBeLessThan(board(g).contracts[0]!.mission.config.incidentMultiplier);
    let top = g;
    for (let i = 0; i < 20; i++) top = reduce(top, { type: 'shiftSafety', step: 1 });
    expect(board(top).safety).toBe(10);
    expect(board(top).contracts[0]!.mission.config.extraLifeSupport).toBeGreaterThan(board(g).contracts[0]!.mission.config.extraLifeSupport);
  });

  it('charges the safety budget per running contract per second', () => {
    const g = chartered();
    const lean = { ...g, boardroom: { ...board(g), safety: 0 } };
    expect(board(tickGame(g, 10)).value).toBeLessThan(board(tickGame(lean, 10)).value);
    expect(safetyCost(board(g))).toBeGreaterThan(0);
    expect(safetyCost({ ...board(g), contracts: [] })).toBe(0);
  });

  it('raises scrutiny for every crew member lost and every contract scuttled, and lets it fade', () => {
    const g = chartered();
    const c = board(g).contracts[0]!;
    const id = Object.keys(c.mission.crew)[0]!;
    const dead = { ...c, mission: { ...c.mission, crew: { ...c.mission.crew, [id]: { ...c.mission.crew[id]!, status: 'lost' as const } } } };
    const after = tickGame({ ...g, boardroom: { ...board(g), contracts: [dead] } }, 1);
    expect(board(after).scrutiny).toBeGreaterThan(0);
    expect(board(tickGame({ ...after, boardroom: { ...board(after), contracts: [] } }, 600)).scrutiny).toBeLessThan(board(after).scrutiny);
  });

  it('opens an inquiry when scrutiny tops out: a fine, a freeze on new charters, and a memo', () => {
    const g = promoted();
    const hot = { ...g, boardroom: { ...board(g), scrutiny: INQUIRY_AT + 1, value: 1e7 } };
    const after = tickGame(hot, 1);
    const b = board(after);
    expect(b.inquiries).toBe(1);
    expect(b.value).toBeLessThan(1e7);
    expect(b.frozenFor).toBeGreaterThan(0);
    expect(b.scrutiny).toBeLessThan(INQUIRY_AT);
    expect(b.log.at(-1)!.text).toMatch(/INQUIRY/);
    expect(reduce(after, { type: 'commission', scenario: 'extraction', seed: 4 })).toBe(after);
  });
});

describe('the Boardroom: divisions and the COO', () => {
  const rich = () => ({ ...promoted(), boardroom: { ...board(promoted()), value: 1e12 } });

  it('lists every division once, each level dearer than the last', () => {
    expect(new Set(DIVISIONS.map((d) => d.id)).size).toBe(DIVISIONS.length);
    for (const d of DIVISIONS.filter((x) => x.max > 1)) expect(divisionCost(d, 1)).toBeGreaterThan(divisionCost(d, 0));
  });

  it('buys division levels with value, up to each one\'s cap', () => {
    const g = reduce(rich(), { type: 'buyDivision', id: 'legal' });
    expect(board(g).divisions.legal).toBe(1);
    expect(board(g).value).toBe(1e12 - divisionCost(DIVISIONS.find((d) => d.id === 'legal')!, 0));
    let top: GameState = rich();
    for (let i = 0; i < 30; i++) top = reduce(top, { type: 'buyDivision', id: 'coo' });
    expect(board(top).divisions.coo).toBe(1);
  });

  it('pays more for specimens with Special Projects, and charges less for charters with Personnel', () => {
    const b = board(rich());
    expect(charterCost({ ...b, divisions: { personnel: 2 } }, 'extraction')).toBeLessThan(charterCost(b, 'extraction'));
    const m = { ...createMissionFor('extraction'), specimens: 10 } as never;
    expect(deliveryValue(m, 'deliver', { ...b, divisions: { specialProjects: 2 } })).toBeGreaterThan(deliveryValue(m, 'deliver', b));
  });

  it('softens scrutiny with Legal, and speeds contracts with Logistics', () => {
    const g = reduce(rich(), { type: 'commission', scenario: 'extraction', seed: 4 });
    const fast = { ...g, boardroom: { ...board(g), divisions: { logistics: 2 } } };
    expect(board(tickGame(fast, 10)).contracts[0]!.mission.elapsed).toBeGreaterThan(board(tickGame(g, 10)).contracts[0]!.mission.elapsed);
    const c = board(g).contracts[0]!;
    const id = Object.keys(c.mission.crew)[0]!;
    const dead = { ...c, mission: { ...c.mission, crew: { ...c.mission.crew, [id]: { ...c.mission.crew[id]!, status: 'lost' as const } } } };
    const plain = board(tickGame({ ...g, boardroom: { ...board(g), contracts: [dead] } }, 1)).scrutiny;
    const lawyered = board(tickGame({ ...g, boardroom: { ...board(g), contracts: [dead], divisions: { legal: 3 } } }, 1)).scrutiny;
    expect(lawyered).toBeLessThan(plain);
  });

  it('has the COO recharter every free office with the best-paying contract on the ledger', () => {
    const g = { ...rich(), boardroom: { ...board(rich()), divisions: { coo: 1 }, slots: 2, ledger: [] } };
    const after = tickGame(g, 1);
    expect(board(after).contracts).toHaveLength(2);
    expect(board(after).contracts.every((c) => c.mission.scenario === 'extraction')).toBe(true);
  });
});
