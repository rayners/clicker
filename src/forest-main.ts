import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/unifrakturmaguntia';
import './forest-ui/ledger.css';
import { catchUp } from './forest/game';
import { forestSaves } from './forest/save';
import { applyForestScenario } from './forest/debug';
import { createForestStore } from './forest/store';
import { mountForest } from './forest-ui/app';
import { charterEvents, charterProperties } from './forest/telemetry';
import { startAnalytics } from './shared/posthog';
import { createOptOut, telemetryAllowed } from './shared/telemetry';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

const storage = window.localStorage;
const seed = (Math.random() * 2 ** 31) | 0;
const loaded = forestSaves.loadGame(storage, Date.now(), seed);
const debug = new URLSearchParams(location.search).get('debug');
const initial = catchUp(loaded.game, Date.now());
const store = createForestStore(debug ? applyForestScenario(initial, debug) : initial);

mountForest(document.getElementById('app')!, store);

const optOut = createOptOut(storage);
startAnalytics({
  store,
  diff: charterEvents,
  context: charterProperties,
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

const save = () => forestSaves.saveGame(storage, store.getState(), Date.now());
setInterval(save, AUTOSAVE_MS);
// iOS Safari may kill a backgrounded tab without firing beforeunload; these two are reliable.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);
void navigator.storage?.persist?.();

// One service worker serves both games from the site root; register it from here too, so the forest works offline
// even if DEEP CONTRACT's page has never been opened. Only built pages have one.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('../sw.js', location.href), { scope: new URL('../', location.href).pathname }).catch(() => undefined);
}
