import { createGame, GAME_VERSION, type GameState } from './game';

export const SAVE_KEY = 'deep-contract.save';
export const CORRUPT_BACKUP_KEY = 'deep-contract.corrupt';
export const CURRENT_VERSION = GAME_VERSION;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type RawSave = Record<string, unknown> & { version: number };
type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

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
};

export function migrate(save: RawSave, migrations: Record<number, Migration>, target: number): RawSave {
  let current: Record<string, unknown> = save;
  for (let v = save.version + 1; v <= target; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No save migration to version ${v}`);
    current = { ...step(current), version: v };
  }
  return current as RawSave;
}

export function serialize(game: GameState): string {
  return JSON.stringify({ ...game, version: CURRENT_VERSION });
}

export function deserialize(text: string): GameState {
  const raw: unknown = JSON.parse(text);
  if (!isRawSave(raw)) throw new Error('Not a DEEP CONTRACT save');
  if (raw.version > CURRENT_VERSION) throw new Error('Save is from a newer version of the game');
  return migrate(raw, MIGRATIONS, CURRENT_VERSION) as unknown as GameState;
}

function isRawSave(value: unknown): value is RawSave {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === 'number' &&
    typeof v.profile === 'object' &&
    v.profile !== null &&
    typeof v.mission === 'object' &&
    v.mission !== null
  );
}

export function saveGame(storage: StorageLike, game: GameState, now: number): boolean {
  try {
    storage.setItem(SAVE_KEY, serialize({ ...game, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(
  storage: StorageLike,
  now: number,
  seed: number,
): { game: GameState; recoveredFromCorruption: boolean } {
  const text = storage.getItem(SAVE_KEY);
  if (text === null) return { game: createGame(seed, now), recoveredFromCorruption: false };
  try {
    return { game: deserialize(text), recoveredFromCorruption: false };
  } catch {
    try {
      storage.setItem(CORRUPT_BACKUP_KEY, text);
    } catch {
      // Nothing more we can do; starting fresh is still better than a crash.
    }
    return { game: createGame(seed, now), recoveredFromCorruption: true };
  }
}

export function exportSave(game: GameState): string {
  const bytes = new TextEncoder().encode(serialize(game));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function importSave(code: string): GameState {
  const binary = atob(code.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes));
}
