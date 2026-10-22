import { describe, it, expect } from 'vitest';
import { veteran } from '../helpers';
import { createMission } from '../../src/mission/state';
import { createGame, newGame, type GameState } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { contractEvents, contractProperties } from '../../src/core/telemetry';
import { startCreature } from '../../src/core/creature';
import { startHunter } from '../../src/core/hunter';

const game = (patch: Partial<GameState> = {}): GameState => ({ ...createGame(1, 0), ...patch });
const withMission = (g: GameState, patch: Partial<GameState['mission']>): GameState => ({ ...g, mission: { ...g.mission, ...patch } as GameState['mission'] });
const names = (prev: GameState, next: GameState) => contractEvents(prev, next).map((e) => e.name);

/** A contract of this kind with the organism, on a first-contract profile (so every event reports cycle 0). */
const onContract = (scenario: 'security' | 'haulage' | 'salvage' | 'overland') => {
  const fresh = newGame(1, 0);
  const g = reduce(veteran(fresh), { type: 'chooseAssignment', scenario, seed: 1 });
  const horror = scenario === 'overland' ? 'quiet' : 'organism';
  return { ...g, mission: createMission({ ...g.mission.config, horror }, 1), profile: fresh.profile } as GameState;
};

describe('DEEP CONTRACT play events', () => {
  it('reports upgrades bought and story beats seen on the way to the first act', () => {
    const before = withMission(game(), { elapsed: 120 });
    const after = withMission(before, { upgrades: [...before.mission.upgrades, 'x'], beats: { ...before.mission.beats, memo: 120 } });
    expect(names(before, after)).toEqual(['upgrade_bought', 'beat_seen']);
  });

  it('reports nothing for an ordinary tick', () => {
    const g = game();
    expect(contractEvents(g, reduce(g, { type: 'tick', dt: 1 }))).toEqual([]);
  });

  it('reports a contract starting, with its scenario, horror and why it started', () => {
    const fresh = newGame(1, 0);
    const started = reduce(fresh, { type: 'chooseAssignment', scenario: 'overland', seed: 2 });
    expect(contractEvents(fresh, started)).toEqual([
      { name: 'contract_started', props: { scenario: 'overland', horror: started.mission.horror, reason: 'start', cycle: 0 } },
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
    const moved = reduce(asking, { type: 'chooseAssignment', scenario: 'overland', seed: 3 });
    expect(contractEvents(asking, moved)).toEqual([
      { name: 'contract_abandoned', props: { scenario: 'extraction', horror: 'organism', act: 2, minutes: 10, cycle: 0 } },
      { name: 'contract_started', props: { scenario: 'overland', horror: moved.mission.horror, reason: 'reassign', cycle: 0 } },
    ]);
  });

  it('does not report a cancelled reassignment', () => {
    const asking = reduce(game(), { type: 'requestReassignment' });
    expect(names(asking, reduce(asking, { type: 'cancelReassignment' }))).toEqual([]);
  });

  it('reports each colony sector secured for the first time on a security contract', () => {
    const g = onContract('security');
    const before = withMission(g, { elapsed: 600 } as never);
    const after = withMission(before, { deepest: 1 } as never);
    expect(contractEvents(before, after)).toEqual([
      { name: 'sector_secured', props: { sector: 'pad', sectors: 1, minutes: 10, horror: 'organism', cycle: 0 } },
    ]);
  });

  it('reports each station reached on a haulage contract, and whether the delivery made its window', () => {
    const g = onContract('haulage');
    const before = withMission(g, { elapsed: 600 } as never);
    const after = withMission(before, { leg: 1, onTime: 1 } as never);
    expect(contractEvents(before, after)).toEqual([
      { name: 'leg_completed', props: { station: 'KESTREL DEPOT', legs: 1, onTime: true, minutes: 10, horror: 'organism', cycle: 0 } },
    ]);
  });

  it('reports each compartment opened on a salvage contract, and the breaches so far', () => {
    const g = onContract('salvage');
    const before = withMission(g, { elapsed: 600 } as never);
    const after = withMission(before, { deepest: 1, breaches: 2 } as never);
    expect(contractEvents(before, after)).toEqual([
      { name: 'compartment_opened', props: { compartment: 'airlock', compartments: 1, breaches: 2, minutes: 10, horror: 'organism', cycle: 0 } },
    ]);
  });

  it('reports named crew turning and each lockdown on an outbreak contract', () => {
    const g = game();
    const before = { ...g, mission: { ...createMission({ ...g.mission.config, horror: 'outbreak' }, 1), elapsed: 600 } } as GameState;
    expect(contractEvents(before, withMission(before, { crewTurned: 2 } as never))).toEqual([
      { name: 'crew_turned', props: { crewTurned: 2, minutes: 10, horror: 'outbreak', cycle: 0 } },
    ]);
    expect(contractEvents(before, withMission(before, { lockdowns: 1 } as never))).toEqual([
      { name: 'lockdown_used', props: { lockdowns: 1, minutes: 10, horror: 'outbreak', cycle: 0 } },
    ]);
  });

  it('names the depot on the overland road', () => {
    const g = onContract('overland');
    const after = withMission(g, { leg: 1, onTime: 0 } as never);
    expect(contractEvents(g, after)[0]).toMatchObject({ name: 'leg_completed', props: { station: 'PIT 4 LOADOUT', onTime: false } });
  });

  it('reports Special Order 0-77 accepted, and each time a WARDEN vents its decks on the creature', () => {
    const g = game();
    const hunting = startCreature(g, 5);
    expect(contractEvents(g, hunting)).toEqual([{ name: 'creature_started', props: {} }]);
    const vented = { ...hunting, creature: { ...hunting.creature!, hunt: { ...hunting.creature!.hunt, beaten: 1, harvest: 20 } } };
    expect(contractEvents(hunting, vented)).toEqual([{ name: 'creature_vented', props: { vented: 1, harvest: 20 } }]);
    expect(contractEvents(vented, reduce(vented, { type: 'tick', dt: 1 }))).toEqual([]);
  });

  it('reports the hunt accepted, and each time a crew drives the hunter off', () => {
    const g = game();
    const hunting = startHunter(g, 5);
    expect(contractEvents(g, hunting)).toEqual([{ name: 'hunter_started', props: {} }]);
    const driven = { ...hunting, hunter: { ...hunting.hunter!, hunt: { ...hunting.hunter!.hunt, beaten: 1, harvest: 30 } } };
    expect(contractEvents(hunting, driven)).toEqual([{ name: 'hunter_driven', props: { driven: 1, harvest: 30 } }]);
    expect(contractEvents(driven, reduce(driven, { type: 'tick', dt: 1 }))).toEqual([]);
  });

  it('describes the player for every event: game, contract and how far along', () => {
    const g = withMission(game(), { act: 3 });
    expect(contractProperties(g)).toEqual({ game: 'deep-contract', scenario: 'extraction', horror: 'organism', act: 3, cycle: 0 });
  });
});
