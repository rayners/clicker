import { buyGenerator, buyRefinery, drill } from '../mission/extraction/economy';
import { buyUpgrade } from '../mission/extraction/upgrades';
import { sleepCrew, wakeCrew } from '../mission/crew';
import { buyContainmentLevel, buyRig, reinforce, vent } from '../mission/organism/containment';
import {
  isExtraction,
  isHaulage,
  isOrganism,
  isSecurity,
  isTerraform,
  type HaulageMission,
  type MissionState,
  type OrganismMission,
  type SecurityMission,
  type TerraformMission,
} from '../mission/state';
import {
  buyFabricator,
  buySecurityUpgrade,
  buySentry,
  buyTrooper,
  fireSupport,
  shiftSplit,
  toggleTacticalNet,
} from '../mission/security/economy';
import { allocate, buyProcessor, buyReactor, buyTerraformUpgrade, surge, thawWave, toggleBalancer } from '../mission/terraform/economy';
import type { Line } from '../data/terraform/systems';
import { advance, newGame, type GameState, type Settings } from './game';
import { createReducerStore, type Listener as SharedListener, type Store as SharedStore } from '../shared/store';
import { chooseAssignment, completeContract, type Ending } from './prestige';
import type { ScenarioId } from '../mission/state';
import { buyCar, buyEngine, buyHaulageUpgrade, fireThrusters, refuel, setBurn, toggleAutopilot } from '../mission/haulage/economy';
import { buyCreatureUpgrade, leaveCreature, startCreature } from './creature';
import { shiftPush, toggleDormant } from '../shared/hunt';

export type Action =
  | { type: 'drill' }
  | { type: 'buyGenerator'; id: string }
  | { type: 'buyRefinery' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'surge' }
  | { type: 'buyReactor'; id: string }
  | { type: 'buyProcessor'; id: string }
  | { type: 'allocate'; line: Line; step: 1 | -1 }
  | { type: 'thawWave' }
  | { type: 'toggleBalancer' }
  | { type: 'fireSupport' }
  | { type: 'buyTrooper'; id: string }
  | { type: 'buyFabricator'; id: string }
  | { type: 'buySentry' }
  | { type: 'shiftSplit'; step: 1 | -1 }
  | { type: 'toggleTacticalNet' }
  | { type: 'fireThrusters' }
  | { type: 'buyEngine'; id: string }
  | { type: 'buyCar'; id: string }
  | { type: 'shiftBurn'; step: 1 | -1 }
  | { type: 'refuel' }
  | { type: 'toggleAutopilot' }
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
  | { type: 'startCreature'; seed: number }
  | { type: 'leaveCreature' }
  | { type: 'shiftCreaturePush'; index: number; step: 1 | -1 }
  | { type: 'toggleCreatureDormant' }
  | { type: 'buyCreatureUpgrade'; id: string }
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

const security = (game: GameState, f: (m: SecurityMission) => MissionState): GameState =>
  isSecurity(game.mission) ? { ...game, mission: f(game.mission) } : game;

const haulage = (game: GameState, f: (m: HaulageMission) => MissionState): GameState =>
  isHaulage(game.mission) ? { ...game, mission: f(game.mission) } : game;

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
      if (isTerraform(game.mission)) return terraform(game, (m) => buyTerraformUpgrade(m, action.id));
      if (isSecurity(game.mission)) return security(game, (m) => buySecurityUpgrade(m, action.id));
      if (isHaulage(game.mission)) return haulage(game, (m) => buyHaulageUpgrade(m, action.id));
      return extraction(game, (m) => buyUpgrade(m, action.id));
    case 'surge':
      return terraform(game, surge);
    case 'buyReactor':
      return terraform(game, (m) => buyReactor(m, action.id));
    case 'buyProcessor':
      return terraform(game, (m) => buyProcessor(m, action.id));
    case 'allocate':
      return terraform(game, (m) => allocate(m, action.line, action.step));
    case 'thawWave':
      return terraform(game, thawWave);
    case 'toggleBalancer':
      return terraform(game, toggleBalancer);
    case 'fireSupport':
      return security(game, fireSupport);
    case 'buyTrooper':
      return security(game, (m) => buyTrooper(m, action.id));
    case 'buyFabricator':
      return security(game, (m) => buyFabricator(m, action.id));
    case 'buySentry':
      return security(game, buySentry);
    case 'shiftSplit':
      return security(game, (m) => shiftSplit(m, action.step));
    case 'toggleTacticalNet':
      return security(game, toggleTacticalNet);
    case 'fireThrusters':
      return haulage(game, fireThrusters);
    case 'buyEngine':
      return haulage(game, (m) => buyEngine(m, action.id));
    case 'buyCar':
      return haulage(game, (m) => buyCar(m, action.id));
    case 'shiftBurn':
      return haulage(game, (m) => setBurn(m, m.burn + action.step));
    case 'refuel':
      return haulage(game, refuel);
    case 'toggleAutopilot':
      return haulage(game, toggleAutopilot);
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
    case 'startCreature':
      return startCreature(game, action.seed);
    case 'leaveCreature':
      return leaveCreature(game);
    case 'shiftCreaturePush':
      return game.creature ? { ...game, creature: { ...game.creature, hunt: shiftPush(game.creature.hunt, action.index, action.step) } } : game;
    case 'toggleCreatureDormant':
      return game.creature ? { ...game, creature: { ...game.creature, hunt: toggleDormant(game.creature.hunt) } } : game;
    case 'buyCreatureUpgrade':
      return buyCreatureUpgrade(game, action.id);
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
