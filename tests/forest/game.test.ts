import { describe, it, expect } from 'vitest';
import { advance, catchUp, createForestGame, FOREST_VERSION, OFFLINE_CAP_SECONDS } from '../../src/forest/game';
import { reduce, createForestStore } from '../../src/forest/store';
import { FOREST_SAVE_KEY, forestSaves } from '../../src/forest/save';

const NOW = 1_700_000_000_000;

describe('an Elderdark game', () => {
  it('wraps one charter (the company) and a persistent profile', () => {
    const g = createForestGame(1, NOW);
    expect(g.version).toBe(FOREST_VERSION);
    expect(g.company.elapsed).toBe(0);
    expect(g.profile.chartersCompleted).toBe(0);
  });

  it('advances the company with live time', () => {
    expect(advance(createForestGame(1, NOW), 0.5).company.elapsed).toBeCloseTo(0.5);
  });

  it('catches up on time away, capped, and notes the absence in the ledger', () => {
    const g = createForestGame(1, NOW);
    const back = catchUp(g, NOW + 20 * 3600 * 1000);
    expect(back.company.elapsed).toBe(OFFLINE_CAP_SECONDS);
    expect(back.company.log.at(-1)!.text).toMatch(/while the factor was away/i);
  });
});

describe('Elderdark actions', () => {
  const rich = () => {
    const g = createForestGame(1, NOW);
    return { ...g, company: { ...g.company, silver: 1e6 } };
  };

  it('forages, hires, adjusts orders, dispatches, builds and does penance', () => {
    let g = reduce(rich(), { type: 'forage' });
    expect(g.company.relics).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) g = reduce(g, { type: 'hire', id: 'blade' });
    g = reduce(g, { type: 'hire', id: 'scout' });
    g = reduce(g, { type: 'adjustOrder', region: 'eaves', id: 'blade', step: 1 });
    expect(g.company.orders.eaves!.blade).toBe(3);
    g = reduce(g, { type: 'dispatch', region: 'eaves' });
    expect(g.company.parties).toHaveLength(1);
    g = reduce(g, { type: 'buyBuilding', id: 'hospice' });
    expect(g.company.buildings.hospice).toBe(1);
    g = { ...g, company: { ...g.company, blight: 30 } };
    expect(reduce(g, { type: 'penance' }).company.blight).toBeLessThan(30);
  });

  it('keeps settings in the profile and starts over on a hard reset', () => {
    let g = reduce(rich(), { type: 'setSetting', key: 'sound', value: true });
    expect(g.profile.settings.sound).toBe(true);
    g = reduce(g, { type: 'hardReset', seed: 4, now: NOW });
    expect(g.company.silver).toBeLessThan(1e6);
    expect(g.profile.settings.sound).toBe(true);
  });

  it('notifies subscribers through a store', () => {
    const store = createForestStore(rich());
    let seen = 0;
    store.subscribe(() => seen++);
    store.dispatch({ type: 'forage' });
    expect(seen).toBe(1);
  });
});

describe('Elderdark saves', () => {
  const memory = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial));
    return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it('use their own key, separate from DEEP CONTRACT', () => {
    expect(FOREST_SAVE_KEY).not.toBe('deep-contract.save');
    const storage = memory();
    forestSaves.saveGame(storage, createForestGame(1, NOW), NOW);
    expect([...storage.data.keys()]).toEqual([FOREST_SAVE_KEY]);
  });

  it('round-trip, and survive corruption', () => {
    const storage = memory();
    const g = reduce(createForestGame(1, NOW), { type: 'forage' });
    forestSaves.saveGame(storage, g, NOW);
    expect(forestSaves.loadGame(storage, NOW, 2).game.company.relics).toBe(g.company.relics);
    const broken = memory({ [FOREST_SAVE_KEY]: '{{nope' });
    expect(forestSaves.loadGame(broken, NOW, 2).recoveredFromCorruption).toBe(true);
  });
});
