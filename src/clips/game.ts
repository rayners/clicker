import { formatDuration, formatNumber } from '../engine/format';
import { createClock } from '../engine/clock';
import { appendLog } from '../engine/log';
import { createSaveSystem, hasShape } from '../engine/save';
import { createReducerStore, type Store } from '../engine/store';
import type { NoteKind } from './content';
import {
  buyAutoclipper,
  buyMarketing,
  buyUpgrade,
  buyWire,
  createWorks,
  makeClip,
  shiftPrice,
  tickWorks,
  type Works,
} from './works';

export const CLIPS_VERSION = 1;
export const CLIPS_SAVE_KEY = 'clips.save';
const ABSENCE_NOTE_SECONDS = 60;

export type Ending = 'sell' | 'cooperative';

export interface ClipsProfile {
  goodwill: number;
  endings: Ending[];
  settings: { sound: boolean; reducedMotion: boolean };
}

export interface ClipsGame {
  version: number;
  savedAt: number;
  profile: ClipsProfile;
  works: Works;
}

export function createClipsGame(seed: number, now: number): ClipsGame {
  return {
    version: CLIPS_VERSION,
    savedAt: now,
    profile: { goodwill: 0, endings: [], settings: { sound: false, reducedMotion: false } },
    works: createWorks(seed),
  };
}

export const clipsSaves = createSaveSystem<ClipsGame>({
  key: CLIPS_SAVE_KEY,
  corruptKey: 'clips.corrupt',
  version: CLIPS_VERSION,
  migrations: {},
  label: 'CLIP WORKS',
  required: ['profile', 'works'],
  fresh: createClipsGame,
  validate: (g) => hasShape(g.works, createWorks(0)) && hasShape(g.profile, createClipsGame(0, 0).profile),
});

const clock = createClock<ClipsGame>({
  tick: (game, dt) => ({ ...game, works: tickWorks(game.works, dt) }),
  step: 1,
  noteAway(before, after, seconds) {
    if (seconds < ABSENCE_NOTE_SECONDS) return after;
    const made = after.works.made - before.works.made;
    const text = `WHILE YOU WERE AWAY (${formatDuration(seconds)}): ${formatNumber(made)} CLIPS, $${formatNumber(after.works.funds - before.works.funds)}.`;
    return { ...after, works: appendLog<NoteKind, Works>(after.works, 'note', text) };
  },
});

/** On load: run the works for the time since the last save. */
export const catchUp = clock.catchUp;

/** Ends a works that has made its million: good will for the next one. */
export function completeWorks(game: ClipsGame, ending: Ending, seed: number): ClipsGame {
  if (!game.works.flags.includes('terminus')) return game;
  const goodwill = game.profile.goodwill + 1;
  return { ...game, profile: { ...game.profile, goodwill, endings: [...game.profile.endings, ending] }, works: createWorks(seed, goodwill) };
}

export type ClipsAction =
  | { type: 'makeClip' }
  | { type: 'shiftPrice'; step: 1 | -1 }
  | { type: 'buyWire' }
  | { type: 'buyAutoclipper' }
  | { type: 'buyMarketing' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'complete'; ending: Ending; seed: number }
  | { type: 'reset'; seed: number; now: number }
  | { type: 'setSetting'; key: keyof ClipsProfile['settings']; value: boolean }
  | { type: 'tick'; dt: number };

const works = (game: ClipsGame, w: Works): ClipsGame => (w === game.works ? game : { ...game, works: w });

export function reduce(game: ClipsGame, action: ClipsAction): ClipsGame {
  const w = game.works;
  switch (action.type) {
    case 'makeClip':
      return works(game, makeClip(w));
    case 'shiftPrice':
      return works(game, shiftPrice(w, action.step));
    case 'buyWire':
      return works(game, buyWire(w));
    case 'buyAutoclipper':
      return works(game, buyAutoclipper(w));
    case 'buyMarketing':
      return works(game, buyMarketing(w));
    case 'buyUpgrade':
      return works(game, buyUpgrade(w, action.id));
    case 'complete':
      return completeWorks(game, action.ending, action.seed);
    case 'reset': {
      const fresh = createClipsGame(action.seed, action.now);
      return { ...fresh, profile: { ...fresh.profile, settings: game.profile.settings } };
    }
    case 'setSetting':
      return { ...game, profile: { ...game.profile, settings: { ...game.profile.settings, [action.key]: action.value } } };
    case 'tick':
      return clock.advance(game, action.dt);
  }
}

export type ClipsStore = Store<ClipsGame, ClipsAction>;

export const createClipsStore = (game: ClipsGame): ClipsStore => createReducerStore(game, reduce);
