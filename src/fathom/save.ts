import { createSaveSystem } from '../shared/save';
import { createFathomGame, FATHOM_VERSION, type FathomGame } from './game';

/** Kept whatever the game ends up being called: the key is never shown to players. */
export const FATHOM_SAVE_KEY = 'fathom.save';

export const fathomSaves = createSaveSystem<FathomGame>({
  key: FATHOM_SAVE_KEY,
  corruptKey: 'fathom.corrupt',
  version: FATHOM_VERSION,
  migrations: {},
  label: 'FATHOM',
  required: ['profile', 'outfit'],
  fresh: createFathomGame,
});
