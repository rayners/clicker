import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/game';
import {
  SAVE_KEY,
  CORRUPT_BACKUP_KEY,
  CURRENT_VERSION,
  serialize,
  deserialize,
  migrate,
  saveGame,
  loadGame,
  exportSave,
  importSave,
  type StorageLike,
} from '../../src/core/save';
import { drill } from '../../src/mission/economy';

const NOW = 1_700_000_000_000;

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const played = () => {
  const g = createGame(9, NOW);
  return { ...g, mission: drill(drill(g.mission)) };
};

describe('serialization', () => {
  it('round-trips a game exactly', () => {
    const g = played();
    expect(deserialize(serialize(g))).toEqual(g);
  });

  it('writes the current schema version', () => {
    expect(JSON.parse(serialize(played())).version).toBe(CURRENT_VERSION);
  });

  it('rejects saves from a newer version of the game', () => {
    const raw = JSON.stringify({ ...played(), version: CURRENT_VERSION + 1 });
    expect(() => deserialize(raw)).toThrow(/newer/i);
  });

  it('rejects data that is not a save', () => {
    expect(() => deserialize('{"hello":1}')).toThrow();
    expect(() => deserialize('not json')).toThrow();
  });
});

describe('migrations', () => {
  it('applies each migration in order from the saved version up to the target', () => {
    const migrations = {
      1: (s: Record<string, unknown>) => ({ ...s, a: 1 }),
      2: (s: Record<string, unknown>) => ({ ...s, b: (s.a as number) + 1 }),
    };
    expect(migrate({ version: 0 }, migrations, 2)).toEqual({ version: 2, a: 1, b: 2 });
    expect(migrate({ version: 1, a: 5 }, migrations, 2)).toEqual({ version: 2, a: 5, b: 6 });
  });

  it('fails loudly when a migration step is missing', () => {
    expect(() => migrate({ version: 0 }, {}, 1)).toThrow(/migration/i);
  });
});

describe('local storage', () => {
  it('starts a fresh game when nothing is saved', () => {
    const { game, recoveredFromCorruption } = loadGame(memoryStorage(), NOW, 3);
    expect(game.mission.elapsed).toBe(0);
    expect(recoveredFromCorruption).toBe(false);
  });

  it('saves and loads, stamping the save time', () => {
    const storage = memoryStorage();
    saveGame(storage, played(), NOW + 500);
    const { game } = loadGame(storage, NOW + 500, 3);
    expect(game.mission.ore).toBe(2);
    expect(game.savedAt).toBe(NOW + 500);
  });

  it('backs up a corrupt save and starts fresh instead of crashing', () => {
    const storage = memoryStorage({ [SAVE_KEY]: '{{garbage' });
    const { game, recoveredFromCorruption } = loadGame(storage, NOW, 3);
    expect(recoveredFromCorruption).toBe(true);
    expect(game.mission.ore).toBe(0);
    expect(storage.data.get(CORRUPT_BACKUP_KEY)).toBe('{{garbage');
  });

  it('reports failure instead of throwing when storage is full or blocked', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveGame(storage, played(), NOW)).toBe(false);
  });

  it('reports success when the save is written', () => {
    expect(saveGame(memoryStorage(), played(), NOW)).toBe(true);
  });
});

describe('export / import', () => {
  it('round-trips through a copyable text code', () => {
    const g = played();
    const code = exportSave(g);
    expect(code).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(importSave(code)).toEqual(g);
  });

  it('survives non-ASCII text such as crew names', () => {
    const g = played();
    const named = { ...g, mission: { ...g.mission, config: { ...g.mission.config, shipName: 'MSV Ōkami — 七' } } };
    expect(importSave(exportSave(named))).toEqual(named);
  });

  it('tolerates surrounding whitespace from copy/paste', () => {
    const g = played();
    expect(importSave(`  ${exportSave(g)}\n`)).toEqual(g);
  });

  it('throws on an invalid code', () => {
    expect(() => importSave('nope!!')).toThrow();
  });
});

describe('real migrations', () => {
  it('upgrades a version 1 save (no settings, no mission seed, no config modifiers)', () => {
    const g = played();
    const v1 = JSON.parse(serialize(g));
    v1.version = 1;
    delete v1.profile.settings;
    delete v1.mission.seed;
    delete v1.mission.config.productionMultiplier;
    delete v1.mission.config.extraLifeSupport;
    delete v1.mission.config.incidentMultiplier;
    const upgraded = deserialize(JSON.stringify(v1));
    expect(upgraded.version).toBe(CURRENT_VERSION);
    expect(upgraded.profile.settings).toEqual({ sound: false, reducedMotion: false });
    expect(upgraded.mission.seed).toBe(g.mission.rng);
    expect(upgraded.mission.config).toMatchObject({ productionMultiplier: 1, extraLifeSupport: 0, incidentMultiplier: 1 });
  });

  it('upgrades a version 2 save: every existing contract is an extraction contract with the organism horror', () => {
    const g = played();
    const v2 = JSON.parse(serialize(g));
    v2.version = 2;
    delete v2.mission.scenario;
    delete v2.mission.horror;
    delete v2.mission.config.scenario;
    delete v2.mission.config.horror;
    v2.profile.history = [{ shipName: 'MSV Calloway Reach', ending: 'deliver', lifetimeOre: 5e8, specimens: 12, crewSurvived: 2, duration: 9000 }];
    const upgraded = deserialize(JSON.stringify(v2));
    expect(upgraded.mission.scenario).toBe('extraction');
    expect(upgraded.mission.horror).toBe('organism');
    expect(upgraded.mission.config).toMatchObject({ scenario: 'extraction', horror: 'organism' });
    expect(upgraded.profile.history[0]).toEqual({
      scenario: 'extraction',
      shipName: 'MSV Calloway Reach',
      ending: 'deliver',
      output: 5e8,
      outputUnit: 'ORE',
      specimens: 12,
      crewSurvived: 2,
      duration: 9000,
    });
  });
});
