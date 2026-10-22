import { buyGenerator, buyRefinery, drill } from '../mission/extraction/economy';
import { buyUpgrade } from '../mission/extraction/upgrades';
import { sleepCrew, wakeCrew } from '../mission/crew';
import { buyContainmentLevel, buyRig, reinforce, vent } from '../mission/organism/containment';
import { buyCulture, buyScreening, buyWard, buyWellness, hireOfficer, lockdown } from '../mission/outbreak/levers';
import { shiftQuarantine } from '../mission/outbreak/spread';
import {
  isExtraction,
  isHaulage,
  isSalvage,
  isOrganism,
  isOutbreak,
  isSecurity,
  isTerraform,
  type HaulageMission,
  type SalvageMission,
  type MissionState,
  type OrganismMission,
  type OutbreakMission,
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
import { chooseAssignment, completeContract, isCreatureUnlocked, isHunterUnlocked, type Ending } from './prestige';
import type { ScenarioId } from '../mission/state';
import { buyCutter, buySalvageUpgrade, buyShoring, cut, shiftNotch, toggleGovernor } from '../mission/salvage/economy';
import { buyCar, buyEngine, buyHaulageUpgrade, fireThrusters, refuel, setBurn, toggleAutopilot } from '../mission/haulage/economy';
import { buyCreatureUpgrade, endCreature, leaveCreature, startCreature } from './creature';
import { commission, enterBoardroom, leaveBoardroom } from './boardroom';
import { buyHunterUpgrade, endHunter, leaveHunter, startHunter } from './hunter';
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
  | { type: 'cut' }
  | { type: 'buyCutter'; id: string }
  | { type: 'buyShoring'; id: string }
  | { type: 'shiftNotch'; step: 1 | -1 }
  | { type: 'toggleGovernor' }
  | { type: 'wakeCrew'; id: string }
  | { type: 'sleepCrew'; id: string }
  | { type: 'buyRig' }
  | { type: 'reinforce' }
  | { type: 'buyContainmentLevel' }
  | { type: 'vent' }
  | { type: 'buyWellness' }
  | { type: 'buyScreening' }
  | { type: 'buyWard' }
  | { type: 'buyCulture' }
  | { type: 'lockdown' }
  | { type: 'hireOfficer' }
  | { type: 'shiftQuarantine'; step: 1 | -1 }
  | { type: 'completeContract'; ending: Ending; seed: number }
  | { type: 'chooseAssignment'; scenario: ScenarioId; seed: number }
  | { type: 'requestReassignment' }
  | { type: 'cancelReassignment' }
  | { type: 'setSetting'; key: keyof Settings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'enterBoardroom'; seed: number }
  | { type: 'leaveBoardroom' }
  | { type: 'commission'; scenario: ScenarioId; seed: number }
  | { type: 'startCreature'; seed: number }
  | { type: 'leaveCreature' }
  | { type: 'shiftCreaturePush'; index: number; step: 1 | -1 }
  | { type: 'toggleCreatureDormant' }
  | { type: 'buyCreatureUpgrade'; id: string }
  | { type: 'startHunter'; seed: number }
  | { type: 'leaveHunter' }
  | { type: 'endHunter' }
  | { type: 'endCreature' }
  | { type: 'shiftHunterPush'; index: number; step: 1 | -1 }
  | { type: 'toggleHunterDormant' }
  | { type: 'buyHunterUpgrade'; id: string }
  | { type: 'tick'; dt: number };

/** Horror actions only apply to missions running that horror. */
const organism = (f: (m: OrganismMission) => OrganismMission) => (m: MissionState) => (isOrganism(m) ? f(m) : m);

const outbreak = (f: (m: OutbreakMission) => OutbreakMission) => (m: MissionState) => (isOutbreak(m) ? f(m) : m);

const MISSION_ACTIONS: Partial<Record<Action['type'], (m: MissionState) => MissionState>> = {
  buyRig: organism(buyRig),
  reinforce: organism(reinforce),
  buyContainmentLevel: organism(buyContainmentLevel),
  vent: organism(vent),
  buyWellness: outbreak(buyWellness),
  buyScreening: outbreak(buyScreening),
  buyWard: outbreak(buyWard),
  buyCulture: outbreak(buyCulture),
  lockdown: outbreak(lockdown),
  hireOfficer: outbreak(hireOfficer),
};

const terraform = (game: GameState, f: (m: TerraformMission) => MissionState): GameState =>
  isTerraform(game.mission) ? { ...game, mission: f(game.mission) } : game;

const security = (game: GameState, f: (m: SecurityMission) => MissionState): GameState =>
  isSecurity(game.mission) ? { ...game, mission: f(game.mission) } : game;

const salvage = (game: GameState, f: (m: SalvageMission) => MissionState): GameState =>
  isSalvage(game.mission) ? { ...game, mission: f(game.mission) } : game;

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
      if (isSalvage(game.mission)) return salvage(game, (m) => buySalvageUpgrade(m, action.id));
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
    case 'cut':
      return salvage(game, cut);
    case 'buyCutter':
      return salvage(game, (m) => buyCutter(m, action.id));
    case 'buyShoring':
      return salvage(game, (m) => buyShoring(m, action.id));
    case 'shiftNotch':
      return salvage(game, (m) => shiftNotch(m, action.step));
    case 'toggleGovernor':
      return salvage(game, toggleGovernor);
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
    case 'enterBoardroom':
      return enterBoardroom(game, action.seed);
    case 'leaveBoardroom':
      return leaveBoardroom(game);
    case 'commission':
      return commission(game, action.scenario, action.seed);
    case 'startCreature':
      return game.creature || isCreatureUnlocked(game.profile) ? startCreature(game, action.seed) : game;
    case 'leaveCreature':
      return leaveCreature(game);
    case 'shiftCreaturePush':
      return game.creature ? { ...game, creature: { ...game.creature, hunt: shiftPush(game.creature.hunt, action.index, action.step) } } : game;
    case 'toggleCreatureDormant':
      return game.creature ? { ...game, creature: { ...game.creature, hunt: toggleDormant(game.creature.hunt) } } : game;
    case 'buyCreatureUpgrade':
      return buyCreatureUpgrade(game, action.id);
    case 'startHunter':
      return game.hunter || isHunterUnlocked(game.profile) ? startHunter(game, action.seed) : game;
    case 'leaveHunter':
      return leaveHunter(game);
    case 'endHunter':
      return endHunter(game);
    case 'endCreature':
      return endCreature(game);
    case 'shiftHunterPush':
      return game.hunter ? { ...game, hunter: { ...game.hunter, hunt: shiftPush(game.hunter.hunt, action.index, action.step) } } : game;
    case 'toggleHunterDormant':
      return game.hunter ? { ...game, hunter: { ...game.hunter, hunt: toggleDormant(game.hunter.hunt) } } : game;
    case 'buyHunterUpgrade':
      return buyHunterUpgrade(game, action.id);
    case 'shiftQuarantine':
      return isOutbreak(game.mission) ? { ...game, mission: shiftQuarantine(game.mission, action.step) } : game;
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
