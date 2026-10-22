import { describe, it, expect } from 'vitest';
import { createGame, GAME_VERSION, newGame, type ContractRecord } from '../../src/core/game';
import { reduce } from '../../src/core/store';
import { horrorFor, OUTBREAK_UNLOCK_CONTRACTS } from '../../src/core/prestige';
import { deserialize, serialize } from '../../src/core/save';
import { veteran } from '../helpers';

const NOW = 1_000;
const record = (horror: ContractRecord['horror']): ContractRecord => ({
  scenario: 'extraction',
  horror,
  shipName: 'X',
  ending: 'deliver',
  output: 1,
  outputUnit: 'T',
  specimens: 0,
  crewSurvived: 7,
  duration: 1,
});
const profile = (contractsCompleted: number, history: ContractRecord[] = []) => ({ ...createGame(1, NOW).profile, contractsCompleted, history });
const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

describe('which horror a contract gets', () => {
  it('is always the organism until the outbreak is unlocked', () => {
    expect(OUTBREAK_UNLOCK_CONTRACTS).toBe(6);
    for (const seed of seeds) expect(horrorFor(profile(OUTBREAK_UNLOCK_CONTRACTS - 1), 'extraction', seed)).toBe('organism');
  });

  it('keeps the overland haul quiet, always', () => {
    for (const seed of seeds) expect(horrorFor(profile(20), 'overland', seed)).toBe('quiet');
  });

  it('draws organism or outbreak from the contract seed once unlocked, about half and half, the same for the same seed', () => {
    const drawn = seeds.map((seed) => horrorFor(profile(OUTBREAK_UNLOCK_CONTRACTS), 'security', seed));
    const outbreaks = drawn.filter((h) => h === 'outbreak').length;
    expect(outbreaks).toBeGreaterThan(60);
    expect(outbreaks).toBeLessThan(140);
    expect(new Set(drawn)).toEqual(new Set(['organism', 'outbreak']));
    expect(horrorFor(profile(10), 'security', 42)).toBe(horrorFor(profile(10), 'security', 42));
  });

  it('never deals the same horror three contracts running', () => {
    for (const seed of seeds) {
      expect(horrorFor(profile(10, [record('outbreak'), record('outbreak')]), 'salvage', seed)).toBe('organism');
      expect(horrorFor(profile(10, [record('outbreak'), record('organism'), record('organism')]), 'salvage', seed)).toBe('outbreak');
    }
  });

  it('starts the chosen contract with the drawn horror, and records it when the contract is done', () => {
    const g = veteran(newGame(1, NOW));
    const seed = seeds.find((s) => horrorFor(g.profile, 'extraction', s) === 'outbreak')!;
    const started = reduce(g, { type: 'chooseAssignment', scenario: 'extraction', seed });
    expect(started.mission.horror).toBe('outbreak');
    expect(started.mission.config.horror).toBe('outbreak');
    const done = { ...started, mission: { ...started.mission, flags: ['terminus'] } };
    const after = reduce(done, { type: 'completeContract', ending: 'scuttle', seed: 3 });
    expect(after.profile.history.at(-1)!.horror).toBe('outbreak');
  });

  it('gives older saves a horror for every contract on record (v9)', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(9);
    const v8 = JSON.parse(serialize(createGame(1, NOW)));
    v8.version = 8;
    const { horror: _h, ...old } = record('organism');
    v8.profile.history = [old, { ...old, scenario: 'overland' }];
    const history = deserialize(JSON.stringify(v8)).profile.history;
    expect(history.map((r) => r.horror)).toEqual(['organism', 'quiet']);
  });
});
