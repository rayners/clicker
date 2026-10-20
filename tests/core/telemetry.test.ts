import { describe, it, expect } from 'vitest';
import { createGame, newGame, type GameState } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { contractEvents, contractProperties } from '../../src/core/telemetry';

const game = (patch: Partial<GameState> = {}): GameState => ({ ...createGame(1, 0), ...patch });
const withMission = (g: GameState, patch: Partial<GameState['mission']>): GameState => ({ ...g, mission: { ...g.mission, ...patch } as GameState['mission'] });
const names = (prev: GameState, next: GameState) => contractEvents(prev, next).map((e) => e.name);

describe('DEEP CONTRACT play events', () => {
  it('reports nothing for an ordinary tick', () => {
    const g = game();
    expect(contractEvents(g, reduce(g, { type: 'tick', dt: 1 }))).toEqual([]);
  });

  it('reports a contract starting, with its scenario, horror and why it started', () => {
    const fresh = newGame(1, 0);
    const started = reduce(fresh, { type: 'chooseAssignment', scenario: 'terraform', seed: 2 });
    expect(contractEvents(fresh, started)).toEqual([
      { name: 'contract_started', props: { scenario: 'terraform', horror: started.mission.horror, reason: 'start', cycle: 0 } },
    ]);
  });

  it('reports each act reached, with how long the contract took to get there', () => {
    const before = withMission(game(), { act: 1, elapsed: 3000 });
    const after = withMission(before, { act: 2 });
    expect(contractEvents(before, after)).toEqual([
      { name: 'act_reached', props: { act: 2, scenario: 'extraction', horror: 'organism', minutes: 50, cycle: 0 } },
    ]);
  });

  it('reports a contract completed, with the ending chosen', () => {
    const due = withMission(game(), { flags: ['terminus'], elapsed: 4 * 3600 });
    const done = reduce(due, { type: 'completeContract', ending: 'scuttle', seed: 9 });
    const [event] = contractEvents(due, done);
    expect(event).toMatchObject({ name: 'contract_completed', props: { ending: 'scuttle', scenario: 'extraction', minutes: 240, cycle: 1 } });
  });

  it('reports a contract abandoned for reassignment, then the new one starting', () => {
    const playing = withMission(game(), { act: 2, elapsed: 600 });
    const asking = reduce(playing, { type: 'requestReassignment' });
    expect(names(playing, asking)).toEqual([]);
    const moved = reduce(asking, { type: 'chooseAssignment', scenario: 'terraform', seed: 3 });
    expect(contractEvents(asking, moved)).toEqual([
      { name: 'contract_abandoned', props: { scenario: 'extraction', horror: 'organism', act: 2, minutes: 10, cycle: 0 } },
      { name: 'contract_started', props: { scenario: 'terraform', horror: moved.mission.horror, reason: 'reassign', cycle: 0 } },
    ]);
  });

  it('does not report a cancelled reassignment', () => {
    const asking = reduce(game(), { type: 'requestReassignment' });
    expect(names(asking, reduce(asking, { type: 'cancelReassignment' }))).toEqual([]);
  });

  it('reports each colony sector secured for the first time on a security contract', () => {
    const g = reduce(newGame(1, 0), { type: 'chooseAssignment', scenario: 'security', seed: 1 });
    const before = withMission(g, { elapsed: 600 } as never);
    const after = withMission(before, { deepest: 1 } as never);
    expect(contractEvents(before, after)).toEqual([
      { name: 'sector_secured', props: { sector: 'pad', sectors: 1, minutes: 10, horror: 'organism', cycle: 0 } },
    ]);
  });

  it('describes the player for every event: game, contract and how far along', () => {
    const g = withMission(game(), { act: 3 });
    expect(contractProperties(g)).toEqual({ game: 'deep-contract', scenario: 'extraction', horror: 'organism', act: 3, cycle: 0 });
  });
});
