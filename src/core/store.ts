import { buyGenerator, buyRefinery, drill } from '../mission/economy';
import { buyUpgrade } from '../mission/upgrades';
import { sleepCrew, wakeCrew } from '../mission/crew';
import { buyContainmentLevel, buyRig, reinforce, vent } from '../mission/containment';
import type { MissionState } from '../mission/state';
import { advance, type GameState } from './game';
import { completeContract, type Ending } from './prestige';

export type Action =
  | { type: 'drill' }
  | { type: 'buyGenerator'; id: string }
  | { type: 'buyRefinery' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'wakeCrew'; id: string }
  | { type: 'sleepCrew'; id: string }
  | { type: 'buyRig' }
  | { type: 'reinforce' }
  | { type: 'buyContainmentLevel' }
  | { type: 'vent' }
  | { type: 'completeContract'; ending: Ending; seed: number }
  | { type: 'tick'; dt: number };

const MISSION_ACTIONS: Partial<Record<Action['type'], (m: MissionState) => MissionState>> = {
  buyRig,
  reinforce,
  buyContainmentLevel,
  vent,
};

export function reduce(game: GameState, action: Action): GameState {
  const simple = MISSION_ACTIONS[action.type];
  if (simple) return { ...game, mission: simple(game.mission) };
  switch (action.type) {
    case 'drill':
      return { ...game, mission: drill(game.mission) };
    case 'buyGenerator':
      return { ...game, mission: buyGenerator(game.mission, action.id) };
    case 'buyRefinery':
      return { ...game, mission: buyRefinery(game.mission) };
    case 'buyUpgrade':
      return { ...game, mission: buyUpgrade(game.mission, action.id) };
    case 'wakeCrew':
      return { ...game, mission: wakeCrew(game.mission, action.id) };
    case 'sleepCrew':
      return { ...game, mission: sleepCrew(game.mission, action.id) };
    case 'completeContract':
      return completeContract(game, action.ending, action.seed);
    case 'tick':
      return advance(game, action.dt).game;
    default:
      return game;
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
