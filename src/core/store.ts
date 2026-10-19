import { buyGenerator, buyRefinery, drill } from '../mission/extraction/economy';
import { buyUpgrade } from '../mission/extraction/upgrades';
import { sleepCrew, wakeCrew } from '../mission/crew';
import { buyContainmentLevel, buyRig, reinforce, vent } from '../mission/organism/containment';
import { isExtraction, isOrganism, type MissionState, type OrganismMission } from '../mission/state';
import { advance, createGame, type GameState, type Settings } from './game';
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
  | { type: 'setSetting'; key: keyof Settings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'tick'; dt: number };

/** Horror actions only apply to missions running that horror. */
const organism = (f: (m: OrganismMission) => OrganismMission) => (m: MissionState) => (isOrganism(m) ? f(m) : m);

const MISSION_ACTIONS: Partial<Record<Action['type'], (m: MissionState) => MissionState>> = {
  buyRig: organism(buyRig),
  reinforce: organism(reinforce),
  buyContainmentLevel: organism(buyContainmentLevel),
  vent: organism(vent),
};

const extraction = (game: GameState, f: (m: Extract<MissionState, { scenario: 'extraction' }>) => MissionState): GameState =>
  isExtraction(game.mission) ? { ...game, mission: f(game.mission) } : game;

export function reduce(game: GameState, action: Action): GameState {
  const simple = MISSION_ACTIONS[action.type];
  if (simple) return { ...game, mission: simple(game.mission) };
  switch (action.type) {
    case 'drill':
      return extraction(game, drill);
    case 'buyGenerator':
      return extraction(game, (m) => buyGenerator(m, action.id));
    case 'buyRefinery':
      return extraction(game, buyRefinery);
    case 'buyUpgrade':
      return extraction(game, (m) => buyUpgrade(m, action.id));
    case 'wakeCrew':
      return { ...game, mission: wakeCrew(game.mission, action.id) };
    case 'sleepCrew':
      return { ...game, mission: sleepCrew(game.mission, action.id) };
    case 'setSetting':
      return { ...game, profile: { ...game.profile, settings: { ...game.profile.settings, [action.key]: action.value } } };
    case 'hardReset': {
      const fresh = createGame(action.seed, action.now);
      return { ...fresh, profile: { ...fresh.profile, settings: game.profile.settings } };
    }
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
