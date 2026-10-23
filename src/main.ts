import '@fontsource/vt323';
import '@fontsource/michroma';
import './engine/ui/engine.css';
import './styles/main.css';
import './styles/crt.css';
import { catchUp } from './core/game';
import { loadGame, saveGame, SAVE_KEY } from './core/save';
import { createBootScreen } from './ui/boot';
import { createStore } from './core/store';
import { mountApp } from './ui/app';
import { applyScenario, debugSpeed, grantCredits, storySummary } from './core/debug';
import { contractEvents, contractProperties } from './core/telemetry';
import { runGame } from './engine/run';

runGame(
  {
    saveKey: SAVE_KEY,
    saves: { loadGame, saveGame },
    catchUp,
    // Dev-only extra: ?grant=N credits on load, with or without a jump.
    createStore: (game) => {
      const grant = import.meta.env.DEV ? new URLSearchParams(location.search).get('grant') : null;
      return createStore(grant ? grantCredits(game, Number(grant)) : game);
    },
    mount(root, store, { fresh, debugging }) {
      mountApp(root, store);
      // A player with no save at all sees WARDEN boot up once.
      if (fresh && !debugging) {
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        document.body.append(createBootScreen({ onDone: () => undefined, reducedMotion }).el);
      }
      // Dev-only extra (docs/ROADMAP.md): ?flags shows the story so far.
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('flags')) {
        const overlay = document.createElement('pre');
        overlay.className = 'debug-flags';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.append(overlay);
        const show = () => (overlay.textContent = storySummary(store.getState()).join('\n'));
        store.subscribe(show);
        show();
      }
    },
    telemetry: { diff: contractEvents, context: contractProperties },
    // Dev-only extras: ?debug=<jump>, ?speed=N runs the clock faster.
    debug: applyScenario,
    speed: debugSpeed,
  },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
);
