import { describe, it, expect } from 'vitest';
import { createProfile, newGame, type GameState } from '../../src/core/game';
import { availableAssignments, availableEndings, completeContract, missionConfigFor } from '../../src/core/prestige';
import { reduce } from '../../src/core/store';

const overland = (): GameState => reduce(newGame(1, 0), { type: 'chooseAssignment', scenario: 'overland', seed: 1 });

describe('the overland haul in the game', () => {
  it('is offered from the start, as the short way in', () => {
    expect(availableAssignments(createProfile())[0]).toBe('overland');
  });

  it('runs a crawler rig with no horror aboard', () => {
    const config = missionConfigFor(createProfile(), 'overland');
    expect(config.scenario).toBe('overland');
    expect(config.horror).toBe('quiet');
    expect(overland().mission.horror).toBe('quiet');
  });

  it('offers one ending at the lift: take the promotion, for seniority', () => {
    const g = overland();
    const due = { ...g, mission: { ...g.mission, flags: ['terminus'] } };
    expect(availableEndings(due)).toEqual(['deliver']);
    const done = completeContract(due, 'deliver', 2);
    expect(done.profile.contractsCompleted).toBe(1);
    expect(done.profile.seniority).toBe(1);
    expect(done.profile.history[0]!.scenario).toBe('overland');
  });

  it('leaves the other contracts their usual endings', () => {
    const g = reduce(newGame(1, 0), { type: 'chooseAssignment', scenario: 'haulage', seed: 1 });
    expect(availableEndings({ ...g, mission: { ...g.mission, flags: ['terminus'] } })).toEqual(['deliver', 'scuttle']);
  });
});
