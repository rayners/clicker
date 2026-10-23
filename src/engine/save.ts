/** A versioned, migrating, corruption-tolerant localStorage save, shared by every game in the repo. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type RawSave = Record<string, unknown> & { version: number };
export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] upgrades a version n-1 save to version n. */
export function migrate(save: RawSave, migrations: Record<number, Migration>, target: number): RawSave {
  let current: Record<string, unknown> = save;
  for (let v = save.version + 1; v <= target; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No save migration to version ${v}`);
    current = { ...step(current), version: v };
  }
  return current as RawSave;
}

export interface SaveSpec<T> {
  key: string;
  corruptKey: string;
  version: number;
  migrations: Record<number, Migration>;
  /** Shown in errors ("Not a <label> save"). */
  label: string;
  /** Required top-level object fields, for telling a save from arbitrary JSON. */
  required: readonly string[];
  fresh(seed: number, now: number): T;
  /** After migration: false when the save is damaged in a way the top-level check cannot see (a field missing). */
  validate?(game: T): boolean;
}

const kind = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/**
 * Whether `value` has every field a fresh `reference` has, each of the same kind (one level down). Fields that are
 * null in the reference may hold anything. A save missing a field would otherwise load and break the screen.
 */
export function hasShape(value: unknown, reference: object): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Object.entries(reference).every(([k, ref]) => ref === null || ref === undefined || kind(v[k]) === kind(ref));
}

export interface SaveSystem<T> {
  serialize(game: T): string;
  deserialize(text: string): T;
  saveGame(storage: StorageLike, game: T, now: number): boolean;
  loadGame(storage: StorageLike, now: number, seed: number): { game: T; recoveredFromCorruption: boolean };
  exportSave(game: T): string;
  importSave(code: string): T;
}

const safely = (check: () => boolean): boolean => {
  try {
    return check();
  } catch {
    return false;
  }
};

export function createSaveSystem<T extends object>(spec: SaveSpec<T>): SaveSystem<T> {
  const isRawSave = (value: unknown): value is RawSave => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.version === 'number' && spec.required.every((k) => typeof v[k] === 'object' && v[k] !== null);
  };

  const serialize = (game: T) => JSON.stringify({ ...game, version: spec.version });

  const deserialize = (text: string): T => {
    const raw: unknown = JSON.parse(text);
    if (!isRawSave(raw)) throw new Error(`Not a ${spec.label} save`);
    if (raw.version > spec.version) throw new Error('Save is from a newer version of the game');
    const game = migrate(raw, spec.migrations, spec.version) as unknown as T;
    if (spec.validate && !safely(() => spec.validate!(game))) throw new Error(`Damaged ${spec.label} save`);
    return game;
  };

  return {
    serialize,
    deserialize,
    saveGame(storage, game, now) {
      try {
        storage.setItem(spec.key, serialize({ ...game, savedAt: now }));
        return true;
      } catch {
        return false;
      }
    },
    loadGame(storage, now, seed) {
      const text = storage.getItem(spec.key);
      if (text === null) return { game: spec.fresh(seed, now), recoveredFromCorruption: false };
      try {
        return { game: deserialize(text), recoveredFromCorruption: false };
      } catch {
        try {
          storage.setItem(spec.corruptKey, text);
        } catch {
          // Nothing more we can do; starting fresh is still better than a crash.
        }
        return { game: spec.fresh(seed, now), recoveredFromCorruption: true };
      }
    },
    exportSave(game) {
      const bytes = new TextEncoder().encode(serialize(game));
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    },
    importSave(code) {
      const binary = atob(code.trim());
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return deserialize(new TextDecoder().decode(bytes));
    },
  };
}
