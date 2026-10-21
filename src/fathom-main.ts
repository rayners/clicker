import '@fontsource/vt323';
import '@fontsource/michroma';
import './fathom-ui/sonar.css';
import { catchUp } from './fathom/game';
import { fathomSaves } from './fathom/save';
import { createFathomStore } from './fathom/store';
import { seasonEvents, seasonProperties } from './fathom/telemetry';
import { mountFathom } from './fathom-ui/app';
import { startAnalytics } from './shared/posthog';
import { createOptOut, telemetryAllowed } from './shared/telemetry';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

const storage = window.localStorage;
const seed = (Math.random() * 2 ** 31) | 0;
const loaded = fathomSaves.loadGame(storage, Date.now(), seed);
const store = createFathomStore(catchUp(loaded.game, Date.now()));

mountFathom(document.getElementById('app')!, store);

const optOut = createOptOut(storage);
startAnalytics({
  store,
  diff: seasonEvents,
  context: seasonProperties,
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

const save = () => fathomSaves.saveGame(storage, store.getState(), Date.now());
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
