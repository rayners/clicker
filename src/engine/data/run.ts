/**
 * Running a game made of data in a page: one call that compiles the definition and hands it to `runGame`.
 * @module
 */
import { runGame, type RunEnv } from '../run';
import { createReducerStore, type Store } from '../store';
import type { GameDefinition } from './definition';
import { compileGame } from './game';
import { createDataPlay, type DataState, type DataStateAction } from './play';
import { mountDataGame } from './screen';

/** Plays a definition in the page: its screen, clock, saves and service worker. It sends no telemetry. */
export function runDataGame(definition: GameDefinition, env: RunEnv): { store: Store<DataState, DataStateAction>; stop(): void } {
  const game = compileGame(definition);
  const play = createDataPlay(game);
  const run = runGame<DataState, DataStateAction>(
    {
      saveKey: play.saveKey,
      saves: play.saves,
      catchUp: play.catchUp,
      createStore: (state) => createReducerStore<DataState, DataStateAction | { type: 'tick'; dt: number }>(state, play.reduce),
      mount: (root, store) => mountDataGame(root, game, store as Store<DataState, DataStateAction>, play),
    },
    env,
  );
  return { store: run.store as Store<DataState, DataStateAction>, stop: run.stop };
}
