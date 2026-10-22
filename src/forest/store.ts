import type { ClassId } from '../forest-data/classes';
import type { BuildingId } from '../forest-data/buildings';
import { createReducerStore, type Store } from '../shared/store';
import { adjustOrder, buyBuilding, buyOil, buyUpgrade, dispatch, forage, hire, penance, post, toggleStanding } from './company';
import { advance, createForestGame, type ForestGame, type ForestSettings } from './game';
import { completeCharter, rewriteCharter, type Ending } from './charter';
import type { SiteId } from './state';
import { buyWoodUpgrade, endWood, leaveWood, startWood } from './wood';
import { buyDragonUpgrade, endDragon, leaveDragon, wakeDragon } from './dragon';
import { shiftPush, toggleDormant } from '../shared/hunt';

export type ForestAction =
  | { type: 'forage' }
  | { type: 'hire'; id: ClassId }
  | { type: 'adjustOrder'; region: string; id: ClassId; step: 1 | -1 }
  | { type: 'dispatch'; region: string }
  | { type: 'buyBuilding'; id: BuildingId }
  | { type: 'penance' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'toggleStanding'; region: string }
  | { type: 'buyOil'; flasks: number }
  | { type: 'post'; floor: number; step: 1 | -1 }
  | { type: 'completeCharter'; ending: Ending; seed: number; site?: SiteId }
  | { type: 'rewriteCharter'; site: SiteId; seed: number }
  | { type: 'startWood'; seed: number }
  | { type: 'shiftWoodPush'; index: number; step: 1 | -1 }
  | { type: 'toggleWoodDormant' }
  | { type: 'buyWoodUpgrade'; id: string }
  | { type: 'leaveWood' }
  | { type: 'endWood' }
  | { type: 'endDragon' }
  | { type: 'wakeDragon'; seed: number }
  | { type: 'shiftDragonPush'; index: number; step: 1 | -1 }
  | { type: 'toggleDragonDormant' }
  | { type: 'buyDragonUpgrade'; id: string }
  | { type: 'leaveDragon' }
  | { type: 'setSetting'; key: keyof ForestSettings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'tick'; dt: number };

export type ForestStore = Store<ForestGame, ForestAction>;

const company = (game: ForestGame, next: ForestGame['company']): ForestGame =>
  next === game.company || game.mode === 'wood' || game.mode === 'dragon' ? game : { ...game, company: next };

export function reduce(game: ForestGame, action: ForestAction): ForestGame {
  const c = game.company;
  switch (action.type) {
    case 'forage':
      return company(game, forage(c));
    case 'hire':
      return company(game, hire(c, action.id));
    case 'adjustOrder':
      return company(game, adjustOrder(c, action.region, action.id, action.step));
    case 'dispatch':
      return company(game, dispatch(c, action.region));
    case 'buyBuilding':
      return company(game, buyBuilding(c, action.id));
    case 'penance':
      return company(game, penance(c));
    case 'buyUpgrade':
      return company(game, buyUpgrade(c, action.id));
    case 'toggleStanding':
      return company(game, toggleStanding(c, action.region));
    case 'buyOil':
      return company(game, buyOil(c, action.flasks));
    case 'post':
      return company(game, post(c, action.floor, action.step));
    case 'completeCharter':
      return completeCharter(game, action.ending, action.seed, action.site);
    case 'rewriteCharter':
      return game.mode === 'wood' || game.mode === 'dragon' ? game : rewriteCharter(game, action.site, action.seed);
    case 'startWood':
      return startWood(game, action.seed);
    case 'shiftWoodPush':
      return game.wood ? { ...game, wood: { ...game.wood, hunt: shiftPush(game.wood.hunt, action.index, action.step) } } : game;
    case 'toggleWoodDormant':
      return game.wood ? { ...game, wood: { ...game.wood, hunt: toggleDormant(game.wood.hunt) } } : game;
    case 'buyWoodUpgrade':
      return buyWoodUpgrade(game, action.id);
    case 'leaveWood':
      return leaveWood(game);
    case 'endWood':
      return endWood(game);
    case 'endDragon':
      return endDragon(game);
    case 'wakeDragon':
      return wakeDragon(game, action.seed);
    case 'shiftDragonPush':
      return game.dragon ? { ...game, dragon: { ...game.dragon, hunt: shiftPush(game.dragon.hunt, action.index, action.step) } } : game;
    case 'toggleDragonDormant':
      return game.dragon ? { ...game, dragon: { ...game.dragon, hunt: toggleDormant(game.dragon.hunt) } } : game;
    case 'buyDragonUpgrade':
      return buyDragonUpgrade(game, action.id);
    case 'leaveDragon':
      return leaveDragon(game);
    case 'setSetting':
      return { ...game, profile: { ...game.profile, settings: { ...game.profile.settings, [action.key]: action.value } } };
    case 'hardReset': {
      const fresh = createForestGame(action.seed, action.now);
      return { ...fresh, profile: { ...fresh.profile, settings: game.profile.settings } };
    }
    case 'tick':
      return advance(game, action.dt);
  }
}

export function createForestStore(initial: ForestGame): ForestStore {
  return createReducerStore(initial, reduce);
}
