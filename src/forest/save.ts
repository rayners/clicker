import { createSaveSystem } from '../shared/save';
import { createForestGame, FOREST_VERSION, type ForestGame } from './game';
import { KEEP } from './state';

const inForest = (company: Record<string, unknown>) => ({
  site: 'forest',
  floors: [],
  posted: [],
  oil: 0,
  ...company,
  orders: { [KEEP]: { blade: 2, mender: 0, scout: 1, mystic: 0 }, ...(company.orders as Record<string, unknown>) },
});

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
    // v3: Quartermaster standing regions, and a count of the dead.
    3: (save) => ({ ...save, company: { standing: [], lifetimeDead: 0, ...(save.company as Record<string, unknown>) } }),
    // v4: the armoury.
    4: (save) => {
      const company = save.company as Record<string, unknown>;
      return { ...save, company: { ...company, buildings: { armoury: 0, ...(company.buildings as Record<string, number>) } } };
    },
    // v5: turned hands and fragments of the Key.
    5: (save) => ({ ...save, company: { turned: 0, turning: 0, keyFragments: 0, ...(save.company as Record<string, unknown>) } }),
    // v6: each company knows which charter it is and what earlier ones earned.
    6: (save) => ({ ...save, company: { charter: { number: 1, renown: 0, grace: 0 }, ...(save.company as Record<string, unknown>) } }),
    // v7: the wood (play as the forest). Old saves are on the charter, with no hunt started and no push on the company.
    7: (save) => ({ ...save, mode: 'charter', wood: null, company: { woodPush: 0, ...(save.company as Record<string, unknown>) } }),
    // v8: charters have a site (the forest or Morrowgate Keep). Every existing company, the wood's included, is in the forest.
    8: (save) => {
      const wood = save.wood as { hunt: { prey: { company: Record<string, unknown> }[] } } | null;
      return {
        ...save,
        company: inForest(save.company as Record<string, unknown>),
        wood: wood && { ...wood, hunt: { ...wood.hunt, prey: wood.hunt.prey.map((p) => ({ ...p, company: inForest(p.company) })) } },
      };
    },
  },
  label: 'ELDERDARK',
  required: ['profile', 'company'],
  fresh: createForestGame,
});
