import { createReducerStore, type Store } from '../shared/store';
import {
  buyCampUpgrade,
  buyCounselor,
  buyLight,
  buyTower,
  shiftSplit,
  toggleHeadCounselor,
  whistle,
} from './camp/economy';
import { advance, newLateGame, type LateGame, type LateSettings } from './game';
import { chooseTape, completeRun } from './sequels';
import type { Ending } from './kinds';
import type { CampRun, Run, VenueId } from './state';

export type LateAction =
  | { type: 'whistle' }
  | { type: 'hire'; id: string }
  | { type: 'buyLight'; id: string }
  | { type: 'buyTower' }
  | { type: 'shiftSplit'; step: 1 | -1 }
  | { type: 'toggleHead' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'chooseTape'; venue: VenueId; seed: number }
  | { type: 'completeRun'; ending: Ending; seed: number }
  | { type: 'setSetting'; key: keyof LateSettings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'tick'; dt: number };

export type LateStore = Store<LateGame, LateAction>;

/** Camp orders apply only to a camp run, and nothing happens while the shelf is open. */
const camp = (game: LateGame, f: (r: CampRun) => Run): LateGame => {
  if (game.shelf || game.run.venue !== 'camp') return game;
  const next = f(game.run as CampRun);
  return next === game.run ? game : { ...game, run: next };
};

export function reduce(game: LateGame, action: LateAction): LateGame {
  switch (action.type) {
    case 'whistle':
      return camp(game, whistle);
    case 'hire':
      return camp(game, (r) => buyCounselor(r, action.id));
    case 'buyLight':
      return camp(game, (r) => buyLight(r, action.id));
    case 'buyTower':
      return camp(game, buyTower);
    case 'shiftSplit':
      return camp(game, (r) => shiftSplit(r, action.step));
    case 'toggleHead':
      return camp(game, toggleHeadCounselor);
    case 'buyUpgrade':
      return camp(game, (r) => buyCampUpgrade(r, action.id));
    case 'chooseTape':
      return chooseTape(game, action.venue, action.seed);
    case 'completeRun':
      return completeRun(game, action.ending, action.seed);
    case 'setSetting':
      return { ...game, profile: { ...game.profile, settings: { ...game.profile.settings, [action.key]: action.value } } };
    case 'hardReset': {
      const fresh = newLateGame(action.seed, action.now);
      return { ...fresh, profile: { ...fresh.profile, settings: game.profile.settings } };
    }
    case 'tick':
      return advance(game, action.dt);
  }
}

export function createLateStore(initial: LateGame): LateStore {
  return createReducerStore(initial, reduce);
}
