import type { ClassId } from '../forest-data/classes';
import type { BuildingId } from '../forest-data/buildings';
import { createReducerStore, type Store } from '../shared/store';
import { adjustOrder, buyBuilding, buyUpgrade, dispatch, forage, hire, penance, toggleStanding } from './company';
import { advance, createForestGame, type ForestGame, type ForestSettings } from './game';

export type ForestAction =
  | { type: 'forage' }
  | { type: 'hire'; id: ClassId }
  | { type: 'adjustOrder'; region: string; id: ClassId; step: 1 | -1 }
  | { type: 'dispatch'; region: string }
  | { type: 'buyBuilding'; id: BuildingId }
  | { type: 'penance' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'toggleStanding'; region: string }
  | { type: 'setSetting'; key: keyof ForestSettings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'tick'; dt: number };

export type ForestStore = Store<ForestGame, ForestAction>;

const company = (game: ForestGame, next: ForestGame['company']): ForestGame => (next === game.company ? game : { ...game, company: next });

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
