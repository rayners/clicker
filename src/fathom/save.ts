import { createSaveSystem } from '../shared/save';
import { createFathomGame, FATHOM_VERSION, type FathomGame } from './game';

/** Kept whatever the game ends up being called: the key is never shown to players. */
export const FATHOM_SAVE_KEY = 'fathom.save';

export const fathomSaves = createSaveSystem<FathomGame>({
  key: FATHOM_SAVE_KEY,
  corruptKey: 'fathom.corrupt',
  version: FATHOM_VERSION,
  migrations: {
    // v2: the pilots' link. Pilots hired before it all share one temperament, so every pair links perfectly.
    2: (save) => {
      const outfit = save.outfit as { pilots: number };
      return { ...save, outfit: { ...outfit, temperaments: Array.from({ length: outfit.pilots }, () => 0.5), fatigue: 0 } };
    },
    // v3: the Source (play as the horror). Older saves are on the season, with no hunt and no push on the outfit.
    3: (save) => ({ ...save, mode: 'season', deep: null, outfit: { deepPush: 0, ...(save.outfit as Record<string, unknown>) } }),
  },
  label: 'FATHOM',
  required: ['profile', 'outfit'],
  fresh: createFathomGame,
});
