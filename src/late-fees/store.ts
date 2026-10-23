import { createReducerStore, type Store } from '../engine/store';
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
import {
  buyAsylumUpgrade,
  buyDoor,
  buyWard,
  hireAsylumStaff,
  rounds,
  shiftSedation,
  toggleAutoSedation,
} from './asylum/economy';
import { advance, newLateGame, type LateGame, type LateSettings } from './game';
import { chooseTape, completeRun, isCutUnlocked, isTapeStocked, tapeFor } from './sequels';
import { buyCutUpgrade, endCut, leaveCut, startCut } from './cut';
import { shiftPush, toggleDormant } from '../engine/hunt';
import type { Ending } from './kinds';
import type { AsylumRun, CampRun, ClinicRun, InsurerRun, KillerId, Run, VenueId } from './state';

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
  | { type: 'rounds' }
  | { type: 'buyWard'; id: string }
  | { type: 'hireAsylumStaff'; id: string }
  | { type: 'shiftSedation'; step: 1 | -1 }
  | { type: 'buyDoor' }
  | { type: 'toggleSedation' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'chooseTape'; venue: VenueId; seed: number; killer?: KillerId }
  | { type: 'completeRun'; ending: Ending; seed: number }
  | { type: 'startCut'; killer: KillerId; seed: number }
  | { type: 'shiftCutPush'; index: number; step: 1 | -1 }
  | { type: 'toggleCutDormant' }
  | { type: 'buyCutUpgrade'; id: string }
  | { type: 'leaveCut' }
  | { type: 'endCut' }
  | { type: 'setSetting'; key: keyof LateSettings; value: boolean }
  | { type: 'hardReset'; seed: number; now: number }
  | { type: 'tick'; dt: number };

export type LateStore = Store<LateGame, LateAction>;

/** Venue orders apply only to a run at that venue, and nothing happens while the shelf is open. */
const at =
  <R extends Run>(venue: VenueId) =>
  (game: LateGame, f: (r: R) => Run): LateGame => {
    if (game.shelf || game.mode === 'cut' || game.run.venue !== venue) return game;
    const next = f(game.run as R);
    return next === game.run ? game : { ...game, run: next };
  };
const camp = at<CampRun>('camp');
const clinic = at<ClinicRun>('clinic');
const insurer = at<InsurerRun>('insurer');
const asylum = at<AsylumRun>('asylum');

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
    case 'rounds':
      return asylum(game, rounds);
    case 'buyWard':
      return asylum(game, (r) => buyWard(r, action.id));
    case 'hireAsylumStaff':
      return asylum(game, (r) => hireAsylumStaff(r, action.id));
    case 'shiftSedation':
      return asylum(game, (r) => shiftSedation(r, action.step));
    case 'buyDoor':
      return asylum(game, buyDoor);
    case 'toggleSedation':
      return asylum(game, toggleAutoSedation);
    case 'buyUpgrade':
      if (game.run.venue === 'clinic') return clinic(game, (r) => buyClinicUpgrade(r, action.id));
      if (game.run.venue === 'insurer') return insurer(game, (r) => buyInsurerUpgrade(r, action.id));
      if (game.run.venue === 'asylum') return asylum(game, (r) => buyAsylumUpgrade(r, action.id));
      return camp(game, (r) => buyCampUpgrade(r, action.id));
    case 'chooseTape':
      // Only what is on the shelf can be rented.
      return isTapeStocked(game.profile, tapeFor(action.venue, action.killer)) ? chooseTape(game, action.venue, action.seed, action.killer) : game;
    case 'completeRun':
      return completeRun(game, action.ending, action.seed);
    case 'startCut':
      return game.cut || isCutUnlocked(game.profile) ? startCut(game, action.killer, action.seed) : game;
    case 'shiftCutPush':
      return game.cut ? { ...game, cut: { ...game.cut, hunt: shiftPush(game.cut.hunt, action.index, action.step) } } : game;
    case 'toggleCutDormant':
      return game.cut ? { ...game, cut: { ...game.cut, hunt: toggleDormant(game.cut.hunt) } } : game;
    case 'buyCutUpgrade':
      return buyCutUpgrade(game, action.id);
    case 'leaveCut':
      return leaveCut(game);
    case 'endCut':
      return endCut(game);
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
