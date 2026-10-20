import { describe, it, expect, vi } from 'vitest';
import { createGame, type GameState } from '../../src/core/game';
import { createMission, TERRAFORM_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { reduce, createStore } from '../../src/core/store';
import { GENERATORS } from '../../src/data/extraction/generators';
import { ext } from '../helpers';

const NOW = 1_000;

describe('reduce', () => {
  it('drills on a drill action', () => {
    expect(ext(reduce(createGame(1, NOW), { type: 'drill' }).mission).ore).toBe(1);
  });

  it('buys a generator', () => {
    const g = createGame(1, NOW);
    const rich = { ...g, mission: { ...g.mission, credits: 1000 } };
    const after = reduce(rich, { type: 'buyGenerator', id: GENERATORS[0]!.id });
    expect(ext(after.mission).generators[GENERATORS[0]!.id]).toBe(1);
  });

  it('upgrades the refinery', () => {
    const g = createGame(1, NOW);
    const rich = { ...g, mission: { ...g.mission, credits: 1e6 } };
    expect(ext(reduce(rich, { type: 'buyRefinery' }).mission).refineryLevel).toBe(1);
  });

  it('advances time on a tick', () => {
    expect(reduce(createGame(1, NOW), { type: 'tick', dt: 1 }).mission.elapsed).toBe(1);
  });
});

describe('store', () => {
  it('holds state and notifies subscribers after each dispatch', () => {
    const store = createStore(createGame(1, NOW));
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'drill' });
    expect(ext(store.getState().mission).ore).toBe(1);
    expect(listener).toHaveBeenCalledWith(store.getState());
  });

  it('can stop notifying a subscriber', () => {
    const store = createStore(createGame(1, NOW));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: 'drill' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('can have its whole state replaced (loading an imported save)', () => {
    const store = createStore(createGame(1, NOW));
    const other = createGame(2, NOW);
    store.replace(other);
    expect(store.getState()).toBe(other);
  });
});

describe('reduce: upgrades', () => {
  it('buys an upgrade', () => {
    const g = createGame(1, NOW);
    const rich = { ...g, mission: { ...g.mission, credits: 1e6, lifetimeOre: 1e6 } };
    const after = reduce(rich, { type: 'buyUpgrade', id: 'tungsten-bits' });
    expect(after.mission.upgrades).toContain('tungsten-bits');
  });
});

describe('reduce: crew', () => {
  it('wakes and sleeps crew', () => {
    const g = createGame(1, NOW);
    const rich = { ...g, mission: { ...g.mission, credits: 1e6, lifetimeCredits: 1e6 } };
    const awake = reduce(rich, { type: 'wakeCrew', id: 'sorensen' });
    expect(awake.mission.crew.sorensen!.status).toBe('awake');
    expect(reduce(awake, { type: 'sleepCrew', id: 'sorensen' }).mission.crew.sorensen!.status).toBe('cryo');
  });
});

describe('reduce: contracts', () => {
  it('completes a contract with the given ending and seed', () => {
    const g = createGame(1, NOW);
    const ready = { ...g, mission: { ...g.mission, flags: ['terminus'] } };
    const after = reduce(ready, { type: 'completeContract', ending: 'scuttle', seed: 77 });
    expect(after.profile.contractsCompleted).toBe(1);
    expect(after.mission.rng).toBe(77);
  });
});

describe('reduce: settings and reset', () => {
  it('changes a setting', () => {
    const after = reduce(createGame(1, NOW), { type: 'setSetting', key: 'sound', value: true });
    expect(after.profile.settings.sound).toBe(true);
  });

  it('hard reset wipes everything, keeping only settings', () => {
    const g = createGame(1, NOW);
    const played = { ...g, profile: { ...g.profile, seniority: 5, settings: { sound: true, reducedMotion: false } }, mission: { ...g.mission, ore: 99 } };
    const after = reduce(played, { type: 'hardReset', seed: 3, now: NOW + 1 });
    expect(after.profile.seniority).toBe(0);
    expect(after.profile.settings.sound).toBe(true);
    expect(ext(after.mission).ore).toBe(0);
    expect(after.mission.seed).toBe(3);
  });
});

describe('reduce: terraform actions', () => {
  const tf = () => {
    const g = createGame(1, NOW);
    return { ...g, mission: createMission(TERRAFORM_MISSION_CONFIG, 1) };
  };

  it('surges, builds and allocates on a terraforming contract', () => {
    let g: GameState = { ...tf(), mission: { ...tf().mission, credits: 1e6 } };
    g = reduce(g, { type: 'surge' });
    g = reduce(g, { type: 'buyReactor', id: 'cells' });
    g = reduce(g, { type: 'buyProcessor', id: 'cracker' });
    g = reduce(g, { type: 'allocate', line: 'heat', step: 1 });
    const m = g.mission as MissionOf<'terraform', 'organism'>;
    expect(m.processed).toBeGreaterThan(0);
    expect(m.reactors.cells).toBe(1);
    expect(m.processors.cracker).toBe(1);
    expect(m.allocation.heat).toBe(4);
  });

  it('ignores extraction actions on a terraforming contract, and vice versa', () => {
    const g = tf();
    expect(reduce(g, { type: 'drill' })).toBe(g);
    const e = createGame(1, NOW);
    expect(reduce(e, { type: 'surge' })).toBe(e);
  });
});

describe('reduce: the colony', () => {
  it('thaws a ready wave and toggles the load balancer on a terraforming contract', () => {
    const g = createGame(1, NOW);
    const base = createMission(TERRAFORM_MISSION_CONFIG, 1);
    const ready: GameState = { ...g, mission: { ...base, processed: 1e9, climate: { atmosphere: 101.3, heat: 288, water: 60 }, upgrades: ['tf-load-balancer'] } };
    const thawed = reduce(ready, { type: 'thawWave' });
    expect((thawed.mission as MissionOf<'terraform', 'organism'>).wavesThawed).toBe(1);
    expect((reduce(ready, { type: 'toggleBalancer' }).mission as MissionOf<'terraform', 'organism'>).balancerOff).toBe(true);
  });
});
