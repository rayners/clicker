/**
 * Running a game in the page: load, catch up, mount, tick, autosave, telemetry and the service worker.
 * @module
 */
import type { SaveSystem } from './save';
import type { Store } from './store';
import { startAnalytics } from './posthog';
import { createOptOut, telemetryAllowed, type TelemetryEvent, type TelemetryProps } from './telemetry';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

/** What the page tells a game as it mounts. */
export interface Visit {
  /** No save at all on this device: a first visit (e.g. show a boot screen once). */
  fresh: boolean;
  /** A dev-only debug jump replaced the loaded game. */
  debugging: boolean;
}

/** Everything a game hands the engine to run in a page. */
export interface GameDef<G, A> {
  /** The storage key its save lives under, to tell a first visit from a return. */
  saveKey: string;
  saves: Pick<SaveSystem<G>, 'loadGame' | 'saveGame'>;
  /** Advance a loaded game by the time it was away (offline progress). */
  catchUp(game: G, now: number): G;
  createStore(game: G): Store<G, A | { type: 'tick'; dt: number }>;
  mount(root: HTMLElement, store: Store<G, A | { type: 'tick'; dt: number }>, visit: Visit): void;
  telemetry: { diff(prev: G, next: G): TelemetryEvent[]; context(game: G): TelemetryProps };
  /** Dev builds only: replace the game for `?debug=<jump>`. The whole query string comes along for extras. */
  debug?(game: G, jump: string, params: URLSearchParams): G;
  /** Dev builds only: how many times faster the clock runs, read from the query string. */
  speed?(search: string): number;
}

/**
 * The page a game runs in. Only `dev` and `prod` are required; the rest default to the real browser and are there
 * for tests.
 */
export interface RunEnv {
  dev: boolean;
  prod: boolean;
  storage?: Storage;
  search?: string;
  hostname?: string;
  root?: HTMLElement;
}

const hasSave = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key) !== null;
  } catch {
    return true;
  }
};

/**
 * Loads a game's save, catches up the time away, applies a dev debug jump, mounts it, and keeps it running: a
 * wall-clock tick, autosave (also on hide and pagehide, which iOS Safari fires reliably), telemetry when allowed,
 * persistent storage and the site's service worker.
 */
export function runGame<G, A>(def: GameDef<G, A>, env: RunEnv): { store: Store<G, A | { type: 'tick'; dt: number }>; stop(): void } {
  const storage = env.storage ?? window.localStorage;
  const search = env.search ?? location.search;
  const now = Date.now();
  const fresh = !hasSave(storage, def.saveKey);
  const loaded = def.saves.loadGame(storage, now, (Math.random() * 2 ** 31) | 0);
  const caught = def.catchUp(loaded.game, now);
  // Debug jumps replace the game, and autosave would write that over the real save: dev builds only.
  const params = new URLSearchParams(search);
  const jump = env.dev ? params.get('debug') : null;
  const store = def.createStore(jump && def.debug ? def.debug(caught, jump, params) : caught);
  def.mount(env.root ?? document.getElementById('app')!, store, { fresh, debugging: !!jump });

  const optOut = createOptOut(storage);
  const stopAnalytics = startAnalytics({
    store: store as Store<G, never>,
    diff: def.telemetry.diff,
    context: def.telemetry.context,
    optOut,
    allowed: telemetryAllowed({ prod: env.prod, hostname: env.hostname ?? location.hostname, search, optedOut: !optOut.sharing() }),
  });

  const speed = env.dev && def.speed ? def.speed(search) : 1;
  let last = now;
  const ticker = setInterval(() => {
    const t = Date.now();
    store.dispatch({ type: 'tick', dt: ((t - last) / 1000) * speed });
    last = t;
  }, TICK_MS);

  const save = () => def.saves.saveGame(storage, store.getState(), Date.now());
  const autosave = setInterval(save, AUTOSAVE_MS);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') save();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', save);
  void navigator.storage?.persist?.();

  // One service worker at the site root serves every page; each registers it, so a game works offline even if no
  // other page has been opened. Only built pages have one.
  if (env.prod && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('../sw.js', location.href), { scope: new URL('../', location.href).pathname }).catch(() => undefined);
  }

  return {
    store,
    stop() {
      clearInterval(ticker);
      clearInterval(autosave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', save);
      stopAnalytics();
    },
  };
}
