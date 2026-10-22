import { createReducerStore, type Store } from '../shared/store';
import { buildBulwark, buildWall, hirePilot } from './breach';
import { advance, createFathomGame, type FathomGame, type FathomSettings } from './game';
import { buyPen, catchSpecimen, shiftEnhancement } from './open-water';
import { completeSeason, type Ending } from './season';
import { buyAttraction, hireGuard, sellPass, shiftOpen } from './shallows';
import { buyBuoy, buyTrawler, shiftRange } from './shelf';
import { buyModule, hireRepairCrew, shiftStation } from './trench';
import { buyUpgrade } from './upgrades';
import { buyDeepUpgrade, leaveDeep, startDeep } from './deep';
import { shiftPush, toggleDormant } from '../shared/hunt';
import type { Outfit } from './state';

export type FathomAction =
  | { type: 'sellPass' }
  | { type: 'buyAttraction'; id: string }
  | { type: 'hireGuard'; id: string }
  | { type: 'shiftOpen'; step: 1 | -1 }
  | { type: 'buyTrawler'; id: string }
  | { type: 'buyBuoy' }
  | { type: 'shiftRange'; step: 1 | -1 }
  | { type: 'catchSpecimen'; id: string }
  | { type: 'buyPen' }
  | { type: 'shiftEnhancement'; step: 1 | -1 }
  | { type: 'buyModule' }
  | { type: 'hireRepairCrew' }
  | { type: 'shiftStation'; step: 1 | -1 }
  | { type: 'buildWall' }
  | { type: 'buildBulwark' }
  | { type: 'hirePilot' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'completeSeason'; ending: Ending; seed: number }
  | { type: 'setSetting'; key: keyof FathomSettings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'startDeep'; seed: number }
  | { type: 'leaveDeep' }
  | { type: 'shiftDeepPush'; index: number; step: 1 | -1 }
  | { type: 'toggleDeepDormant' }
  | { type: 'buyDeepUpgrade'; id: string }
  | { type: 'tick'; dt: number };

export type FathomStore = Store<FathomGame, FathomAction>;

const outfit = (game: FathomGame, next: Outfit): FathomGame => (next === game.outfit || game.mode === 'deep' ? game : { ...game, outfit: next });

export function reduce(game: FathomGame, action: FathomAction): FathomGame {
  const o = game.outfit;
  switch (action.type) {
    case 'sellPass':
      return outfit(game, sellPass(o));
    case 'buyAttraction':
      return outfit(game, buyAttraction(o, action.id));
    case 'hireGuard':
      return outfit(game, hireGuard(o, action.id));
    case 'shiftOpen':
      return outfit(game, shiftOpen(o, action.step));
    case 'buyTrawler':
      return outfit(game, buyTrawler(o, action.id));
    case 'buyBuoy':
      return outfit(game, buyBuoy(o));
    case 'shiftRange':
      return outfit(game, shiftRange(o, action.step));
    case 'catchSpecimen':
      return outfit(game, catchSpecimen(o, action.id));
    case 'buyPen':
      return outfit(game, buyPen(o));
    case 'shiftEnhancement':
      return outfit(game, shiftEnhancement(o, action.step));
    case 'buyModule':
      return outfit(game, buyModule(o));
    case 'hireRepairCrew':
      return outfit(game, hireRepairCrew(o));
    case 'shiftStation':
      return outfit(game, shiftStation(o, action.step));
    case 'buildWall':
      return outfit(game, buildWall(o));
    case 'buildBulwark':
      return outfit(game, buildBulwark(o));
    case 'hirePilot':
      return outfit(game, hirePilot(o));
    case 'buyUpgrade':
      return outfit(game, buyUpgrade(o, action.id));
    case 'completeSeason':
      return completeSeason(game, action.ending, action.seed);
    case 'setSetting':
      return { ...game, profile: { ...game.profile, settings: { ...game.profile.settings, [action.key]: action.value } } };
    case 'hardReset': {
      const fresh = createFathomGame(action.seed, action.now);
      return { ...fresh, profile: { ...fresh.profile, settings: game.profile.settings } };
    }
    case 'startDeep':
      return startDeep(game, action.seed);
    case 'leaveDeep':
      return leaveDeep(game);
    case 'shiftDeepPush':
      return game.deep ? { ...game, deep: { ...game.deep, hunt: shiftPush(game.deep.hunt, action.index, action.step) } } : game;
    case 'toggleDeepDormant':
      return game.deep ? { ...game, deep: { ...game.deep, hunt: toggleDormant(game.deep.hunt) } } : game;
    case 'buyDeepUpgrade':
      return buyDeepUpgrade(game, action.id);
    case 'tick':
      return advance(game, action.dt);
  }
}

export function createFathomStore(initial: FathomGame): FathomStore {
  return createReducerStore(initial, reduce);
}
