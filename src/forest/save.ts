import { createSaveSystem } from '../shared/save';
import { createForestGame, FOREST_VERSION, type ForestGame } from './game';

export const FOREST_SAVE_KEY = 'elderdark.save';

export const forestSaves = createSaveSystem<ForestGame>({
  key: FOREST_SAVE_KEY,
  corruptKey: 'elderdark.corrupt',
  version: FOREST_VERSION,
  migrations: {
    // v2: the delve is charted by returning parties instead of derived from relics recovered.
    // Carry the old derived delve over so no region closes again.
    2: (save) => {
      const company = save.company as Record<string, unknown>;
      const relics = Number(company.lifetimeRelics ?? 0);
      return { ...save, company: { charted: Math.floor(0.5 * Math.log10(1 + relics) ** 1.6), ...company } };
    },
  },
  label: 'ELDERDARK',
  required: ['profile', 'company'],
  fresh: createForestGame,
});
