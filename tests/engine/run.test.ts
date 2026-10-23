// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runGame, type GameDef } from '../../src/engine/run';
import { createReducerStore } from '../../src/engine/store';

interface Toy {
  savedAt: number;
  clock: number;
  jump?: string;
}
type ToyAction = { type: 'tick'; dt: number };

const KEY = 'toy.save';

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

function toy(overrides: Partial<GameDef<Toy, ToyAction>> = {}) {
  const mounted: { game: Toy; fresh: boolean; debugging: boolean }[] = [];
  const def: GameDef<Toy, ToyAction> = {
    saveKey: KEY,
    saves: {
      loadGame: (storage, now) => {
        const text = storage.getItem(KEY);
        return { game: text ? (JSON.parse(text) as Toy) : { savedAt: now, clock: 0 }, recoveredFromCorruption: false };
      },
      saveGame: (storage, game, now) => (storage.setItem(KEY, JSON.stringify({ ...game, savedAt: now })), true),
    },
    catchUp: (game, now) => ({ ...game, clock: game.clock + (now - game.savedAt) / 1000 }),
    createStore: (game) => createReducerStore<Toy, ToyAction>(game, (g, a) => ({ ...g, clock: g.clock + a.dt })),
    mount: (_root, store, visit) => void mounted.push({ game: store.getState(), ...visit }),
    telemetry: { diff: () => [], context: () => ({}) },
    debug: (game, jump) => ({ ...game, jump }),
    ...overrides,
  };
  return { def, mounted };
}

const env = (over: Partial<Parameters<typeof runGame>[1]> = {}) => ({
  dev: false,
  prod: false,
  storage: memoryStorage(),
  search: '',
  ...over,
});

let stop: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
});

describe('running a game in the page', () => {
  it('loads the save, counts the time away, and mounts the game', () => {
    const { def, mounted } = toy();
    const storage = memoryStorage({ [KEY]: JSON.stringify({ savedAt: 40_000, clock: 5 }) });
    ({ stop } = runGame(def, env({ storage })));
    expect(mounted).toHaveLength(1);
    expect(mounted[0]!.game.clock).toBe(65);
  });

  it('tells the game whether this is a first visit, with no save at all', () => {
    const first = toy();
    ({ stop } = runGame(first.def, env()));
    expect(first.mounted[0]!.fresh).toBe(true);
    stop();
    const returning = toy();
    ({ stop } = runGame(returning.def, env({ storage: memoryStorage({ [KEY]: JSON.stringify({ savedAt: 100_000, clock: 0 }) }) })));
    expect(returning.mounted[0]!.fresh).toBe(false);
  });

  it('ticks the game with wall-clock seconds, so time with the phone asleep still counts', () => {
    const { def } = toy();
    const run = runGame(def, env());
    stop = run.stop;
    vi.advanceTimersByTime(1000);
    expect(run.store.getState().clock).toBeCloseTo(1);
  });

  it('runs the clock faster in dev builds when the game asks for a debug speed', () => {
    const { def } = toy({ speed: (search) => Number(new URLSearchParams(search).get('speed') ?? 1) });
    const run = runGame(def, env({ dev: true, search: '?speed=10' }));
    stop = run.stop;
    vi.advanceTimersByTime(1000);
    expect(run.store.getState().clock).toBeCloseTo(10);
  });

  it('autosaves every ten seconds, and when the page is hidden or closed', () => {
    const storage = memoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    ({ stop } = runGame(toy().def, env({ storage })));
    vi.advanceTimersByTime(10_000);
    expect(setItem).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    expect(setItem).toHaveBeenCalledTimes(3);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  it('applies a debug jump only in dev builds, and says so to the game', () => {
    const dev = toy();
    const run = runGame(dev.def, env({ dev: true, search: '?debug=veteran' }));
    expect(run.store.getState().jump).toBe('veteran');
    expect(dev.mounted[0]!.debugging).toBe(true);
    run.stop();
    const built = toy();
    const prod = runGame(built.def, env({ prod: true, search: '?debug=veteran' }));
    stop = prod.stop;
    expect(prod.store.getState().jump).toBeUndefined();
    expect(built.mounted[0]!.debugging).toBe(false);
  });

  it('stops ticking and saving once stopped', () => {
    const storage = memoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    const run = runGame(toy().def, env({ storage }));
    run.stop();
    vi.advanceTimersByTime(20_000);
    window.dispatchEvent(new Event('pagehide'));
    expect(setItem).not.toHaveBeenCalled();
    expect(run.store.getState().clock).toBe(0);
  });
});
