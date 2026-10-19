import '@fontsource/vt323';
import '@fontsource/michroma';
import './styles/main.css';
import './styles/crt.css';
import { catchUp } from './core/game';
import { loadGame, saveGame } from './core/save';
import { createStore } from './core/store';
import { mountApp } from './ui/app';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

const storage = window.localStorage;
const seed = (Math.random() * 2 ** 31) | 0;
const loaded = loadGame(storage, Date.now(), seed);
const store = createStore(catchUp(loaded.game, Date.now()).game);

mountApp(document.getElementById('app')!, store);

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
