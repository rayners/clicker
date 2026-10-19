import { buyGenerator, buyRefinery, drill } from '../mission/economy';
import { advance, type GameState } from './game';

export type Action =
  | { type: 'drill' }
  | { type: 'buyGenerator'; id: string }
  | { type: 'buyRefinery' }
  | { type: 'tick'; dt: number };

export function reduce(game: GameState, action: Action): GameState {
  switch (action.type) {
    case 'drill':
      return { ...game, mission: drill(game.mission) };
    case 'buyGenerator':
      return { ...game, mission: buyGenerator(game.mission, action.id) };
    case 'buyRefinery':
      return { ...game, mission: buyRefinery(game.mission) };
    case 'tick':
      return advance(game, action.dt).game;
  }
}

export type Listener = (state: GameState) => void;

export interface Store {
  getState(): GameState;
  dispatch(action: Action): void;
  subscribe(listener: Listener): () => void;
  replace(state: GameState): void;
}

export function createStore(initial: GameState): Store {
  let state = initial;
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l(state));
  return {
    getState: () => state,
    dispatch(action) {
      state = reduce(state, action);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replace(next) {
      state = next;
      notify();
    },
  };
}
