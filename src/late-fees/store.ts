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
import {
  buyBed,
  buyClinicUpgrade,
  buySuppressant,
  hireStaff,
  reading,
  shiftRem,
  toggleAutoDial,
} from './clinic/economy';
import {
  buyInsurerUpgrade,
  buyPolicy,
  hireAgent,
  sellPolicy,
  shiftAppetite,
  toggleActuary,
} from './insurer/economy';
import { advance, newLateGame, type LateGame, type LateSettings } from './game';
import { chooseTape, completeRun } from './sequels';
import type { Ending } from './kinds';
import type { CampRun, ClinicRun, InsurerRun, Run, VenueId } from './state';

export type LateAction =
  | { type: 'whistle' }
  | { type: 'hire'; id: string }
  | { type: 'buyLight'; id: string }
  | { type: 'buyTower' }
  | { type: 'shiftSplit'; step: 1 | -1 }
  | { type: 'toggleHead' }
  | { type: 'reading' }
  | { type: 'buyBed'; id: string }
  | { type: 'hireStaff'; id: string }
  | { type: 'shiftRem'; step: 1 | -1 }
  | { type: 'buySuppressant' }
  | { type: 'toggleDial' }
  | { type: 'sell' }
  | { type: 'buyPolicy'; id: string }
  | { type: 'hireAgent'; id: string }
  | { type: 'shiftAppetite'; step: 1 | -1 }
  | { type: 'toggleActuary' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'chooseTape'; venue: VenueId; seed: number }
  | { type: 'completeRun'; ending: Ending; seed: number }
  | { type: 'setSetting'; key: keyof LateSettings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'tick'; dt: number };

export type LateStore = Store<LateGame, LateAction>;

/** Venue orders apply only to a run at that venue, and nothing happens while the shelf is open. */
const at =
  <R extends Run>(venue: VenueId) =>
  (game: LateGame, f: (r: R) => Run): LateGame => {
    if (game.shelf || game.run.venue !== venue) return game;
    const next = f(game.run as R);
    return next === game.run ? game : { ...game, run: next };
  };
const camp = at<CampRun>('camp');
const clinic = at<ClinicRun>('clinic');
const insurer = at<InsurerRun>('insurer');

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
    case 'reading':
      return clinic(game, reading);
    case 'buyBed':
      return clinic(game, (r) => buyBed(r, action.id));
    case 'hireStaff':
      return clinic(game, (r) => hireStaff(r, action.id));
    case 'shiftRem':
      return clinic(game, (r) => shiftRem(r, action.step));
    case 'buySuppressant':
      return clinic(game, buySuppressant);
    case 'toggleDial':
      return clinic(game, toggleAutoDial);
    case 'sell':
      return insurer(game, sellPolicy);
    case 'buyPolicy':
      return insurer(game, (r) => buyPolicy(r, action.id));
    case 'hireAgent':
      return insurer(game, (r) => hireAgent(r, action.id));
    case 'shiftAppetite':
      return insurer(game, (r) => shiftAppetite(r, action.step));
    case 'toggleActuary':
      return insurer(game, toggleActuary);
    case 'buyUpgrade':
      if (game.run.venue === 'clinic') return clinic(game, (r) => buyClinicUpgrade(r, action.id));
      if (game.run.venue === 'insurer') return insurer(game, (r) => buyInsurerUpgrade(r, action.id));
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
