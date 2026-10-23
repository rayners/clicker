import './engine/ui/engine.css';
import './clips-ui/clips.css';
import { catchUp, CLIPS_SAVE_KEY, clipsSaves, createClipsStore } from './clips/game';
import { mountClips } from './clips-ui/app';
import { runGame } from './engine/run';

// The example game: built from the engine's README and reference alone. It sends no telemetry.
runGame(
  {
    saveKey: CLIPS_SAVE_KEY,
    saves: clipsSaves,
    catchUp,
    createStore: createClipsStore,
    mount: mountClips,
  },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
);
