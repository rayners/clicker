import { createSaveSystem } from '../shared/save';
import { LATE_VERSION, newLateGame, type LateGame } from './game';

export const LATE_SAVE_KEY = 'latefees.save';

export const lateSaves = createSaveSystem<LateGame>({
  key: LATE_SAVE_KEY,
  corruptKey: 'latefees.corrupt',
  version: LATE_VERSION,
  migrations: {},
  label: 'LATE FEES',
  required: ['profile', 'run'],
  fresh: newLateGame,
});
