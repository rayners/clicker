import { describe, it, expect, vi } from 'vitest';
import { createGame } from '../../src/core/game';
import { reduce, createStore } from '../../src/core/store';
import { GENERATORS } from '../../src/data/generators';

const NOW = 1_000;

describe('reduce', () => {
  it('drills on a drill action', () => {
    expect(reduce(createGame(1, NOW), { type: 'drill' }).mission.ore).toBe(1);
  });

  it('buys a generator', () => {
    const g = createGame(1, NOW);
    const rich = { ...g, mission: { ...g.mission, credits: 1000 } };
    const after = reduce(rich, { type: 'buyGenerator', id: GENERATORS[0]!.id });
    expect(after.mission.generators[GENERATORS[0]!.id]).toBe(1);
  });

  it('upgrades the refinery', () => {
    const g = createGame(1, NOW);
    const rich = { ...g, mission: { ...g.mission, credits: 1e6 } };
    expect(reduce(rich, { type: 'buyRefinery' }).mission.refineryLevel).toBe(1);
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
    expect(store.getState().mission.ore).toBe(1);
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
