/**
 * Playing a game made of data: the saved state around a run (settings, save version), its reducer with reset and
 * endings, its save system and its clock.
 * @module
 */
import { createClock } from '../clock';
import { formatDuration, formatNumber } from '../format';
import { appendLog } from '../log';
import { createSaveSystem, hasShape, type SaveSystem } from '../save';
import type { PlayerSettings } from '../ui/settings';
import type { DataAction, DataGame, DataRun } from './game';

/** What a data game saves: the run, and the player's settings. */
export interface DataState {
  version: number;
  savedAt: number;
  settings: PlayerSettings;
  run: DataRun;
}

/** Everything the page can do: the game's own actions, plus ending a run, settings and a reset. */
export type DataStateAction =
  | DataAction
  | { type: 'complete'; ending: string; seed: number }
  | { type: 'setSetting'; key: keyof PlayerSettings; value: boolean }
  | { type: 'reset'; seed: number; now: number };

/** Longer away than this is worth a line in the log. */
const ABSENCE_NOTE_SECONDS = 60;

/** The pieces a page needs to play a compiled game. */
export function createDataPlay(game: DataGame): {
  saveKey: string;
  fresh(seed: number, now: number): DataState;
  reduce(state: DataState, action: DataStateAction): DataState;
  saves: SaveSystem<DataState>;
  advance(state: DataState, dt: number): DataState;
  catchUp(state: DataState, now: number): DataState;
} {
  const def = game.definition;
  const saveKey = `data.${def.id}.save`;
  const fresh = (seed: number, now: number): DataState => ({ version: def.version, savedAt: now, settings: { sound: false, reducedMotion: false }, run: game.create(seed) });
  const noted = Object.entries(def.resources).filter(([, r]) => r.lifetime || r.format === 'money');

  const clock = createClock<DataState>({
    tick: (state, dt) => ({ ...state, run: game.tick(state.run, dt) }),
    step: 1,
    noteAway(before, after, seconds) {
      if (seconds < ABSENCE_NOTE_SECONDS) return after;
      const gains = noted
        .map(([id, r]) => {
          const gain = (after.run.amounts[id] ?? 0) - (before.run.amounts[id] ?? 0);
          return `${r.format === 'money' ? '$' : ''}${formatNumber(gain)} ${r.label}`;
        })
        .join(', ');
      return { ...after, run: appendLog<string, DataRun>(after.run, 'note', `WHILE YOU WERE AWAY (${formatDuration(seconds)}): ${gains}.`) };
    },
  });

  const reduce = (state: DataState, action: DataStateAction): DataState => {
    switch (action.type) {
      case 'tick':
        return clock.advance(state, action.dt);
      case 'complete':
        return { ...state, run: game.complete(state.run, action.ending, action.seed) };
      case 'setSetting':
        return { ...state, settings: { ...state.settings, [action.key]: action.value } };
      case 'reset':
        return { ...fresh(action.seed, action.now), settings: state.settings };
      default: {
        const run = game.reduce(state.run, action);
        return run === state.run ? state : { ...state, run };
      }
    }
  };

  const saves = createSaveSystem<DataState>({
    key: saveKey,
    corruptKey: `data.${def.id}.corrupt`,
    version: def.version,
    migrations: {},
    label: def.title,
    required: ['settings', 'run'],
    fresh,
    validate: (state) => hasShape(state.run, game.create(0)),
  });

  return { saveKey, fresh, reduce, saves, advance: clock.advance, catchUp: clock.catchUp };
}
