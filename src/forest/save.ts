import { createSaveSystem } from '../shared/save';
import { createForestGame, FOREST_VERSION, type ForestGame } from './game';

export const FOREST_SAVE_KEY = 'elderdark.save';

export const forestSaves = createSaveSystem<ForestGame>({
  key: FOREST_SAVE_KEY,
  corruptKey: 'elderdark.corrupt',
  version: FOREST_VERSION,
  migrations: {},
  label: 'ELDERDARK',
  required: ['profile', 'company'],
  fresh: createForestGame,
});
