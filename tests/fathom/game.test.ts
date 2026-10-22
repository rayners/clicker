import { describe, it, expect } from 'vitest';
import { advance, catchUp, createFathomGame, FATHOM_VERSION, OFFLINE_CAP_SECONDS } from '../../src/fathom/game';
import { availableEndings, completeSeason, endingRewards } from '../../src/fathom/season';
import { reduce } from '../../src/fathom/store';
import { fathomSaves, FATHOM_SAVE_KEY } from '../../src/fathom/save';
import { incomeRate, watch } from '../../src/fathom/shallows';
import { ATTRACTIONS, GUARDS } from '../../src/fathom-data/shallows';
import type { FathomGame } from '../../src/fathom/game';

const NOW = 1_000_000;
const due = (patch: Partial<FathomGame['outfit']> = {}, profile: Partial<FathomGame['profile']> = {}): FathomGame => {
  const g = createFathomGame(1, NOW);
  return { ...g, profile: { ...g.profile, ...profile }, outfit: { ...g.outfit, flags: ['terminus'], elapsed: 15_000, lifetimeCash: 1e12, ...patch } };
};

describe('a season of the deep-water game', () => {
  it('starts on the beach, first season, with a fresh profile', () => {
    const g = createFathomGame(1, NOW);
    expect(g.version).toBe(FATHOM_VERSION);
    expect(g.outfit.terms.season).toBe(1);
    expect(g.profile.seasons).toBe(0);
  });

  it('advances the season by real seconds, and catches up time away, capped', () => {
    const g = createFathomGame(1, NOW);
    expect(advance(g, 1).outfit.elapsed).toBe(1);
    const later = catchUp({ ...g, savedAt: NOW }, NOW + 1e9 * 1000);
    expect(later.outfit.elapsed).toBe(OFFLINE_CAP_SECONDS);
  });

  it('offers nothing until the season ends, then closing the breach or letting the company study it; going through only to veterans', () => {
    expect(availableEndings(createFathomGame(1, NOW))).toEqual([]);
    expect(availableEndings(due())).toEqual(['close', 'study']);
    expect(availableEndings(due({}, { seasons: 3, notes: 3 }))).toEqual(['close', 'study', 'through']);
  });

  it('rewards field notes for closing it and standing for studying it, and banks the season', () => {
    const r = endingRewards(due());
    expect(r.close.notes).toBeGreaterThan(0);
    expect(r.study.standing).toBeGreaterThan(0);
    const next = completeSeason(due(), 'study', 2);
    expect(next.profile.seasons).toBe(1);
    expect(next.profile.standing).toBe(r.study.standing);
    expect(next.profile.history).toHaveLength(1);
    expect(next.outfit.terms.season).toBe(2);
    expect(next.outfit.elapsed).toBe(0);
  });

  it('starts every later season on what earlier ones earned: standing pays more, field notes stretch every guard', () => {
    const plain = { ...createFathomGame(1, NOW).outfit, attractions: { [ATTRACTIONS[0]!.id]: 10 }, guards: { [GUARDS[0]!.id]: 5 } };
    const veteran = { ...plain, terms: { season: 4, standing: 4, notes: 4 } };
    expect(incomeRate(veteran)).toBeGreaterThan(incomeRate(plain));
    expect(watch(veteran)).toBeGreaterThan(watch(plain));
  });

  it('takes orders through the store, zone by zone', () => {
    let g = createFathomGame(1, NOW);
    g = reduce(g, { type: 'sellPass' });
    expect(g.outfit.cash).toBeGreaterThan(0);
    g = { ...g, outfit: { ...g.outfit, cash: 1e15, lifetimeCash: 1e15, flags: ['breach'] } };
    for (const action of [
      { type: 'buyAttraction', id: 'umbrellas' },
      { type: 'hireGuard', id: 'lifeguard' },
      { type: 'shiftOpen', step: 1 },
      { type: 'buyTrawler', id: 'skiff' },
      { type: 'buyBuoy' },
      { type: 'shiftRange', step: 1 },
      { type: 'catchSpecimen', id: 'reef' },
      { type: 'buyPen' },
      { type: 'shiftEnhancement', step: 1 },
      { type: 'buyModule' },
      { type: 'hireRepairCrew' },
      { type: 'shiftStation', step: 1 },
      { type: 'buildWall' },
      { type: 'buildBulwark' },
      { type: 'hirePilot' },
    ] as const) {
      const next = reduce(g, action);
      expect(next, action.type).not.toBe(g);
      g = next;
    }
  });

  it('keeps its own save, and survives a save and reload', () => {
    expect(FATHOM_SAVE_KEY).toBe('fathom.save');
    const g = advance(createFathomGame(1, NOW), 1);
    expect(fathomSaves.deserialize(fathomSaves.serialize(g)).outfit.elapsed).toBe(1);
  });

  it('brings an older save forward: its pilots link perfectly and nobody is tired yet', () => {
    const g = createFathomGame(1, NOW);
    const { temperaments: _t, fatigue: _f, ...old } = { ...g.outfit, pilots: 4 };
    const loaded = fathomSaves.deserialize(JSON.stringify({ ...g, version: 1, outfit: old }));
    expect(loaded.version).toBe(FATHOM_VERSION);
    expect(loaded.outfit.temperaments).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(loaded.outfit.fatigue).toBe(0);
  });
});
