import { createProfile, GAME_VERSION, newGame, type GameState } from './game';
import { createSaveSystem, hasShape, migrate, type Migration, type StorageLike } from '../shared/save';
import { createMission } from '../mission/state';

export { migrate, type StorageLike };

export const SAVE_KEY = 'deep-contract.save';
export const CORRUPT_BACKUP_KEY = 'deep-contract.corrupt';
export const CURRENT_VERSION = GAME_VERSION;

/** MIGRATIONS[n] upgrades a version n-1 save to version n. */
const MIGRATIONS: Record<number, Migration> = {
  // v2: settings, a stable mission seed, and per-mission config modifiers (prestige).
  2: (save) => {
    const profile = save.profile as Record<string, unknown>;
    const mission = save.mission as Record<string, unknown>;
    const config = mission.config as Record<string, unknown>;
    return {
      ...save,
      profile: { settings: { sound: false, reducedMotion: false }, ...profile },
      mission: {
        seed: mission.rng,
        ...mission,
        config: { productionMultiplier: 1, extraLifeSupport: 0, incidentMultiplier: 1, ...config },
      },
    };
  },
  // v3: contracts name their scenario and horror; contract records keep a generic headline output.
  3: (save) => {
    const profile = save.profile as Record<string, unknown>;
    const mission = save.mission as Record<string, unknown>;
    const config = mission.config as Record<string, unknown>;
    const history = (profile.history as Record<string, unknown>[] | undefined) ?? [];
    return {
      ...save,
      profile: {
        ...profile,
        history: history.map(({ lifetimeOre, ...record }) => ({
          scenario: 'extraction',
          ...record,
          output: lifetimeOre,
          outputUnit: 'ORE',
        })),
      },
      mission: {
        scenario: 'extraction',
        horror: 'organism',
        ...mission,
        config: { scenario: 'extraction', horror: 'organism', ...config },
      },
    };
  },
  // v4: games can be waiting for the player to choose the next contract.
  4: (save) => ({ assigning: false, ...save }),
  // v5: terraforming has a climate and a colony.
  5: (save) => {
    const mission = save.mission as Record<string, unknown>;
    if (mission.scenario !== 'terraform') return save;
    return {
      ...save,
      mission: {
        climate: { atmosphere: 0, heat: 61, water: 0 },
        colonists: 0,
        wavesThawed: 0,
        colonistsLost: 0,
        sickness: 0,
        balancerOff: false,
        ...mission,
      },
    };
  },
  // v6: Special Order 0-77 (the creature) can be accepted alongside the contract.
  6: (save) => ({ mode: 'mission', creature: null, ...save }),
  // v7: the hunt (the hunter) can be accepted too.
  7: (save) => ({ hunter: null, ...save }),
  // v8: Legend, carried out of finished hunts. Nobody has finished one yet.
  8: (save) => ({ ...save, profile: { legend: {}, ...(save.profile as Record<string, unknown>) } }),
  // Contract records name their horror; every contract before the outbreak was the organism, or quiet on the road.
  9: (save) => {
    const profile = save.profile as { history?: { scenario: string }[] };
    const history = (profile.history ?? []).map((r) => ({ horror: r.scenario === 'overland' ? 'quiet' : 'organism', ...r }));
    return { ...save, profile: { ...profile, history } };
  },
  10: (save) => ({ boardroom: null, ...save }),
  11: (save) => ({ ...save, profile: { boardTerms: 0, dividends: 0, ...(save.profile as Record<string, unknown>) } }),
};

const saves = createSaveSystem<GameState>({
  key: SAVE_KEY,
  corruptKey: CORRUPT_BACKUP_KEY,
  version: CURRENT_VERSION,
  migrations: MIGRATIONS,
  label: 'DEEP CONTRACT',
  required: ['profile', 'mission'],
  fresh: newGame,
  // Every field a fresh profile and a fresh contract of the same kind have, so a damaged save never loads.
  validate: (g) => hasShape(g.profile, createProfile()) && hasShape(g.mission, createMission(g.mission.config, 1)),
});

export const { serialize, deserialize, saveGame, loadGame, exportSave, importSave } = saves;
