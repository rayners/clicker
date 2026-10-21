import '@fontsource/vt323';
import '@fontsource/michroma';
import './styles/main.css';
import './styles/crt.css';
import { catchUp } from './core/game';
import { loadGame, saveGame } from './core/save';
import { createStore } from './core/store';
import { mountApp } from './ui/app';
import { applyScenario } from './core/debug';
import { contractEvents, contractProperties } from './core/telemetry';
import { startAnalytics } from './shared/posthog';
import { createOptOut, telemetryAllowed } from './shared/telemetry';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

const storage = window.localStorage;
const seed = (Math.random() * 2 ** 31) | 0;
const loaded = loadGame(storage, Date.now(), seed);
// Debug jumps replace the game, and autosave would write that over the real save: dev builds only.
const debug = import.meta.env.DEV ? new URLSearchParams(location.search).get('debug') : null;
const initial = catchUp(loaded.game, Date.now()).game;
const store = createStore(debug ? applyScenario(initial, debug) : initial);

mountApp(document.getElementById('app')!, store);

const optOut = createOptOut(storage);
startAnalytics({
  store,
  diff: contractEvents,
  context: contractProperties,
  optOut,
  allowed: telemetryAllowed({ prod: import.meta.env.PROD, hostname: location.hostname, search: location.search, optedOut: !optOut.sharing() }),
});

// Wall-clock dt (not performance.now) so time spent with the phone asleep still counts.
let last = Date.now();
setInterval(() => {
  const now = Date.now();
  store.dispatch({ type: 'tick', dt: (now - last) / 1000 });
  last = now;
}, TICK_MS);

const save = () => saveGame(storage, store.getState(), Date.now());
setInterval(save, AUTOSAVE_MS);
// iOS Safari may kill a backgrounded tab without firing beforeunload; these two are reliable.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);

void navigator.storage?.persist?.();

// One service worker serves every page from the site root; register it from here too, so the game works offline
// even if the picker has never been opened. Only built pages have one.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('../sw.js', location.href), { scope: new URL('../', location.href).pathname }).catch(() => undefined);
}
