import { describe, it, expect } from 'vitest';
import { createGame, GAME_VERSION, tickGame, type GameState } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { BOARDROOM_UNLOCK_CONTRACTS } from '../../src/core/prestige';
import { charterCost, commission, createBoardroom, freeSlot, START_VALUE } from '../../src/core/boardroom';
import { deserialize, serialize } from '../../src/core/save';
import { applyScenario } from '../../src/core/debug';
import { veteran } from '../helpers';

const NOW = 1_000;
const promoted = (): GameState => reduce(veteran(createGame(1, NOW)), { type: 'enterBoardroom', seed: 9 });
const board = (g: GameState) => g.boardroom!;

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
