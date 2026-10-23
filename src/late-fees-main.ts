import '@fontsource/vt323';
import '@fontsource/monoton';
import './late-fees-ui/vhs.css';
import { catchUp } from './late-fees/game';
import { applyLateScenario } from './late-fees/debug';
import { LATE_SAVE_KEY, lateSaves } from './late-fees/save';
import { createLateStore } from './late-fees/store';
import { filmEvents, filmProperties } from './late-fees/telemetry';
import { mountLate } from './late-fees-ui/app';
import { runGame } from './engine/run';

// Debug jumps (dev builds only): ?debug=member stocks the whole shelf for testing.
runGame(
  {
    saveKey: LATE_SAVE_KEY,
    saves: lateSaves,
    catchUp,
    createStore: createLateStore,
    mount: mountLate,
    telemetry: { diff: filmEvents, context: filmProperties },
    debug: applyLateScenario,
  },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
);
