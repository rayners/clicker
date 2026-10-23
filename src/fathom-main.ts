import '@fontsource/vt323';
import '@fontsource/michroma';
import './fathom-ui/sonar.css';
import { catchUp } from './fathom/game';
import { applyFathomScenario } from './fathom/debug';
import { FATHOM_SAVE_KEY, fathomSaves } from './fathom/save';
import { createFathomStore } from './fathom/store';
import { seasonEvents, seasonProperties } from './fathom/telemetry';
import { mountFathom } from './fathom-ui/app';
import { runGame } from './engine/run';

// Debug jumps (dev builds only): ?debug=veteran opens what a new outfit cannot reach yet.
runGame(
  {
    saveKey: FATHOM_SAVE_KEY,
    saves: fathomSaves,
    catchUp,
    createStore: createFathomStore,
    mount: mountFathom,
    telemetry: { diff: seasonEvents, context: seasonProperties },
    debug: applyFathomScenario,
  },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
);
