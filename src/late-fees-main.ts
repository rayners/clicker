import '@fontsource/vt323';
import '@fontsource/monoton';
import './late-fees-ui/vhs.css';
import { catchUp } from './late-fees/game';
import { applyLateScenario } from './late-fees/debug';
import { lateSaves } from './late-fees/save';
import { createLateStore } from './late-fees/store';
import { filmEvents, filmProperties } from './late-fees/telemetry';
import { mountLate } from './late-fees-ui/app';
import { startAnalytics } from './shared/posthog';
import { createOptOut, telemetryAllowed } from './shared/telemetry';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

const storage = window.localStorage;
const seed = (Math.random() * 2 ** 31) | 0;
const loaded = lateSaves.loadGame(storage, Date.now(), seed);
// Debug jumps (dev builds only): ?debug=member stocks the whole shelf for testing.
const debug = import.meta.env.DEV ? new URLSearchParams(location.search).get('debug') : null;
const caught = catchUp(loaded.game, Date.now());
const store = createLateStore(debug ? applyLateScenario(caught, debug) : caught);

mountLate(document.getElementById('app')!, store);

const optOut = createOptOut(storage);
startAnalytics({
  store,
  diff: filmEvents,
  context: filmProperties,
  optOut,
  allowed: telemetryAllowed({ prod: import.meta.env.PROD, hostname: location.hostname, search: location.search, optedOut: !optOut.sharing() }),
});

// Wall-clock dt so time with the phone asleep still counts.
let last = Date.now();
setInterval(() => {
  const now = Date.now();
  store.dispatch({ type: 'tick', dt: (now - last) / 1000 });
  last = now;
}, TICK_MS);

const save = () => lateSaves.saveGame(storage, store.getState(), Date.now());
setInterval(save, AUTOSAVE_MS);
// iOS Safari may kill a backgrounded tab without firing beforeunload; these two are reliable.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);
void navigator.storage?.persist?.();

// One service worker at the site root serves every page; register it from here too. Only built pages have one.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('../sw.js', location.href), { scope: new URL('../', location.href).pathname }).catch(() => undefined);
}
