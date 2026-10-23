import { describe, it, expect } from 'vitest';
import { veteran } from '../helpers';
import { createGame, newGame, tickGame, GAME_VERSION } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { assignmentUnlock, availableAssignments, TERRAFORM_UNLOCK_CONTRACTS } from '../../src/core/prestige';
import { deserialize, serialize } from '../../src/core/save';
import { loadGame } from '../../src/core/save';

const NOW = 1_000;

describe('choosing a contract assignment', () => {
  it('asks a brand-new game which contract to take before anything runs', () => {
    const g = newGame(1, NOW);
    expect(g.assigning).toBe('start');
    expect(tickGame(g, 60)).toEqual(g);
  });

  it('starts the chosen contract, shaped by the profile, and stops asking', () => {
    const g = reduce(veteran(newGame(1, NOW)), { type: 'chooseAssignment', scenario: 'terraform', seed: 5 });
    expect(g.assigning).toBe(false);
    expect(g.mission.scenario).toBe('terraform');
    expect(g.mission.seed).toBe(5);
    expect(g.mission.config.shipName).toMatch(/station/i);
  });

  it('offers a new player only the short overland haul, and opens the rest contract by contract', () => {
    const after = (n: number) => availableAssignments({ ...createGame(1, NOW).profile, contractsCompleted: n });
    expect(after(0)).toEqual(['overland']);
    expect(after(1)).toEqual(['overland', 'extraction', 'haulage']);
    expect(after(2)).toContain('terraform');
    expect(after(2)).not.toContain('security');
    expect(after(3)).toContain('security');
    expect(after(4)).toContain('salvage');
    expect(TERRAFORM_UNLOCK_CONTRACTS).toBe(2);
  });

  it('says how many contracts unlock each one that is still closed', () => {
    expect(assignmentUnlock('salvage')).toBe(4);
    expect(assignmentUnlock('overland')).toBe(0);
  });

  it('refuses a contract that has not been unlocked yet', () => {
    const g = newGame(1, NOW);
    expect(reduce(g, { type: 'chooseAssignment', scenario: 'salvage', seed: 5 })).toBe(g);
  });

  it('refuses an assignment that is not available', () => {
    const g = newGame(1, NOW);
    expect(reduce(g, { type: 'chooseAssignment', scenario: 'nope' as never, seed: 5 })).toBe(g);
  });

  it('lets the player request reassignment mid-contract, and cancel it', () => {
    const playing = createGame(1, NOW);
    const asking = reduce(playing, { type: 'requestReassignment' });
    expect(asking.assigning).toBe('reassign');
    expect(asking.mission).toBe(playing.mission);
    expect(reduce(asking, { type: 'cancelReassignment' }).assigning).toBe(false);
    // A new player or a finished contract must choose; there is nothing to go back to.
    const fresh = newGame(1, NOW);
    expect(reduce(fresh, { type: 'cancelReassignment' })).toBe(fresh);
  });

  it('ignores a reassignment request while a contract is being chosen (a new game, or after one ends)', () => {
    const fresh = newGame(1, NOW);
    expect(reduce(fresh, { type: 'requestReassignment' })).toBe(fresh);
    const renewal = { ...createGame(1, NOW), assigning: 'renewal' as const };
    expect(reduce(renewal, { type: 'requestReassignment' })).toBe(renewal);
  });

  it('abandoning a contract by reassignment grants nothing and does not count as completed', () => {
    const playing = { ...createGame(1, NOW), assigning: 'reassign' as const };
    const next = reduce(playing, { type: 'chooseAssignment', scenario: 'overland', seed: 9 });
    expect(next.profile).toEqual(playing.profile);
    expect(next.mission.seed).toBe(9);
  });

  it('asks for the next assignment after a contract is completed', () => {
    const g = createGame(1, NOW);
    const done = { ...g, mission: { ...g.mission, flags: ['terminus'] } };
    const after = reduce(done, { type: 'completeContract', ending: 'deliver', seed: 3 });
    expect(after.profile.contractsCompleted).toBe(1);
    expect(after.assigning).toBe('renewal');
  });

  it('starts a fresh save, and a hard reset, at the assignment screen', () => {
    const storage = { getItem: () => null, setItem: () => undefined };
    expect(loadGame(storage, NOW, 1).game.assigning).toBe('start');
    expect(reduce(createGame(1, NOW), { type: 'hardReset', seed: 2, now: NOW }).assigning).toBe('start');
  });

  it('keeps the assignment state in saves (v4)', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(4);
    const g = newGame(1, NOW);
    expect(deserialize(serialize(g)).assigning).toBe('start');
    const v3 = JSON.parse(serialize(createGame(1, NOW)));
    v3.version = 3;
    delete v3.assigning;
    expect(deserialize(JSON.stringify(v3)).assigning).toBe(false);
  });
});
