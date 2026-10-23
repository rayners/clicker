import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/unifrakturmaguntia';
import './forest-ui/ledger.css';
import { catchUp } from './forest/game';
import { FOREST_SAVE_KEY, forestSaves } from './forest/save';
import { applyForestScenario } from './forest/debug';
import { createForestStore } from './forest/store';
import { mountForest } from './forest-ui/app';
import { charterEvents, charterProperties } from './forest/telemetry';
import { runGame } from './engine/run';

// Debug jumps (dev builds only): ?debug=keep|keep-deep|veteran.
runGame(
  {
    saveKey: FOREST_SAVE_KEY,
    saves: forestSaves,
    catchUp,
    createStore: createForestStore,
    mount: mountForest,
    telemetry: { diff: charterEvents, context: charterProperties },
    debug: applyForestScenario,
  },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
);
