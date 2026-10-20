import { buyGenerator, buyRefinery, drill } from '../mission/extraction/economy';
import { buyUpgrade } from '../mission/extraction/upgrades';
import { sleepCrew, wakeCrew } from '../mission/crew';
import { buyContainmentLevel, buyRig, reinforce, vent } from '../mission/organism/containment';
import { isExtraction, isOrganism, isTerraform, type MissionState, type OrganismMission, type TerraformMission } from '../mission/state';
import { allocate, buyProcessor, buyReactor, buyTerraformUpgrade, surge } from '../mission/terraform/economy';
import type { Line } from '../data/terraform/systems';
import { advance, newGame, type GameState, type Settings } from './game';
import { createReducerStore, type Listener as SharedListener, type Store as SharedStore } from '../shared/store';
import { chooseAssignment, completeContract, type Ending } from './prestige';
import type { ScenarioId } from '../mission/state';

export type Action =
  | { type: 'drill' }
  | { type: 'buyGenerator'; id: string }
  | { type: 'buyRefinery' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'surge' }
  | { type: 'buyReactor'; id: string }
  | { type: 'buyProcessor'; id: string }
  | { type: 'allocate'; line: Line; step: 1 | -1 }
  | { type: 'wakeCrew'; id: string }
  | { type: 'sleepCrew'; id: string }
  | { type: 'buyRig' }
  | { type: 'reinforce' }
  | { type: 'buyContainmentLevel' }
  | { type: 'vent' }
  | { type: 'completeContract'; ending: Ending; seed: number }
  | { type: 'chooseAssignment'; scenario: ScenarioId; seed: number }
  | { type: 'requestReassignment' }
  | { type: 'cancelReassignment' }
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

const terraform = (game: GameState, f: (m: TerraformMission) => MissionState): GameState =>
  isTerraform(game.mission) ? { ...game, mission: f(game.mission) } : game;

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
      return isTerraform(game.mission) ? terraform(game, (m) => buyTerraformUpgrade(m, action.id)) : extraction(game, (m) => buyUpgrade(m, action.id));
    case 'surge':
      return terraform(game, surge);
    case 'buyReactor':
      return terraform(game, (m) => buyReactor(m, action.id));
    case 'buyProcessor':
      return terraform(game, (m) => buyProcessor(m, action.id));
    case 'allocate':
      return terraform(game, (m) => allocate(m, action.line, action.step));
    case 'wakeCrew':
      return { ...game, mission: wakeCrew(game.mission, action.id) };
    case 'sleepCrew':
      return { ...game, mission: sleepCrew(game.mission, action.id) };
    case 'setSetting':
      return { ...game, profile: { ...game.profile, settings: { ...game.profile.settings, [action.key]: action.value } } };
    case 'hardReset': {
      const fresh = newGame(action.seed, action.now);
      return { ...fresh, profile: { ...fresh.profile, settings: game.profile.settings } };
    }
    case 'chooseAssignment':
      return chooseAssignment(game, action.scenario, action.seed);
    case 'requestReassignment':
      return { ...game, assigning: 'reassign' };
    case 'cancelReassignment':
      return game.assigning === 'reassign' ? { ...game, assigning: false } : game;
    case 'completeContract':
      return completeContract(game, action.ending, action.seed);
    case 'tick':
      return advance(game, action.dt).game;
    default:
      return game;
  }
}

export type Listener = SharedListener<GameState>;
export type Store = SharedStore<GameState, Action>;

export function createStore(initial: GameState): Store {
  return createReducerStore(initial, reduce);
}
