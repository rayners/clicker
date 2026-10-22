import { describe, it, expect } from 'vitest';
import { createGame, createProfile, newGame, type GameState } from '../../src/core/game';
import { availableAssignments, missionConfigFor } from '../../src/core/prestige';
import { reduce } from '../../src/core/store';
import { SALVAGE_UPGRADES } from '../../src/data/salvage/upgrades';
import { CUTTERS, SHORING } from '../../src/data/salvage/systems';
import type { SalvageMission } from '../../src/mission/state';

const salvage = (patch: Partial<SalvageMission> = {}): GameState => {
  const g = reduce(newGame(1, 0), { type: 'chooseAssignment', scenario: 'salvage', seed: 1 });
  return { ...g, mission: { ...g.mission, ...patch } as GameState['mission'] };
};
const m = (g: GameState) => g.mission as SalvageMission;

describe('salvage contracts in the game', () => {
  it('are offered from the start while they are being play-tested', () => {
    expect(availableAssignments(createProfile())).toContain('salvage');
  });

  it('run aboard a salvage tug, named for the cycle', () => {
    const config = missionConfigFor(createProfile(), 'salvage');
    expect(config.scenario).toBe('salvage');
    expect(config.shipName).toBe('Corvid Tithe');
    expect(missionConfigFor({ ...createProfile(), contractsCompleted: 1 }, 'salvage').shipName).not.toBe(config.shipName);
  });

  it('start when chosen at assignment', () => {
    expect(salvage().mission.scenario).toBe('salvage');
    expect(salvage().assigning).toBe(false);
  });

  it('take player orders: cut, cutters, shoring, the torch dial and the hull governor', () => {
    let g = salvage({ credits: 1e9, recovered: 1e9 });
    g = reduce(g, { type: 'cut' });
    expect(m(g).ground[0]!.control).toBeGreaterThan(0);
    g = reduce(g, { type: 'buyCutter', id: CUTTERS[0]!.id });
    expect(m(g).cutters[CUTTERS[0]!.id]).toBe(1);
    g = reduce(g, { type: 'buyShoring', id: SHORING[0]!.id });
    expect(m(g).shoring[SHORING[0]!.id]).toBe(1);
    g = reduce(g, { type: 'shiftNotch', step: 1 });
    expect(m(g).notch).toBe(6);
    const governor = SALVAGE_UPGRADES.find((u) => u.effect.kind === 'governor')!;
    g = reduce(g, { type: 'buyUpgrade', id: governor.id });
    expect(m(g).upgrades).toContain(governor.id);
    g = reduce(g, { type: 'toggleGovernor' });
    expect(m(g).governorOff).toBe(true);
  });

  it('ignore orders meant for other contracts', () => {
    const g = createGame(1, 0);
    expect(reduce(g, { type: 'cut' })).toBe(g);
    expect(reduce(g, { type: 'shiftNotch', step: 1 })).toBe(g);
  });
});
