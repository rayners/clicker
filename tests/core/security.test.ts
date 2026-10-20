import { describe, it, expect } from 'vitest';
import { createGame, createProfile, newGame, type GameState } from '../../src/core/game';
import { availableAssignments, missionConfigFor } from '../../src/core/prestige';
import { reduce } from '../../src/core/store';
import { SECURITY_UPGRADES } from '../../src/data/security/upgrades';
import { FABRICATORS, TROOPERS } from '../../src/data/security/systems';
import type { SecurityMission } from '../../src/mission/state';

const security = (patch: Partial<SecurityMission> = {}): GameState => {
  const g = reduce(newGame(1, 0), { type: 'chooseAssignment', scenario: 'security', seed: 1 });
  return { ...g, mission: { ...g.mission, ...patch } as GameState['mission'] };
};
const m = (g: GameState) => g.mission as SecurityMission;

describe('security contracts in the game', () => {
  it('are offered from the start while they are being play-tested', () => {
    expect(availableAssignments(createProfile())).toContain('security');
  });

  it('run aboard a security transport, named for the cycle', () => {
    const config = missionConfigFor(createProfile(), 'security');
    expect(config.scenario).toBe('security');
    expect(config.shipName).toMatch(/CSV/);
    expect(missionConfigFor({ ...createProfile(), contractsCompleted: 1 }, 'security').shipName).not.toBe(config.shipName);
  });

  it('start when chosen at assignment', () => {
    expect(security().mission.scenario).toBe('security');
    expect(security().assigning).toBe(false);
  });

  it('take player orders: fire support, troopers, fabricators, sentries, the split and the tactical net', () => {
    let g = security({ credits: 1e9, recovered: 1e9 });
    g = reduce(g, { type: 'fireSupport' });
    expect(m(g).ground[0]!.control).toBeGreaterThan(0);
    g = reduce(g, { type: 'buyTrooper', id: TROOPERS[0]!.id });
    expect(m(g).troopers[TROOPERS[0]!.id]).toBe(1);
    g = reduce(g, { type: 'buyFabricator', id: FABRICATORS[0]!.id });
    expect(m(g).fabricators[FABRICATORS[0]!.id]).toBe(1);
    g = reduce(g, { type: 'buySentry' });
    expect(m(g).sentries).toBe(1);
    const share = m(g).assaultShare;
    g = reduce(g, { type: 'shiftSplit', step: -1 });
    expect(m(g).assaultShare).toBe(share - 1);
    const net = SECURITY_UPGRADES.find((u) => u.effect.kind === 'tacticalNet')!;
    g = reduce(g, { type: 'buyUpgrade', id: net.id });
    expect(m(g).upgrades).toContain(net.id);
    g = reduce(g, { type: 'toggleTacticalNet' });
    expect(m(g).netOff).toBe(true);
  });

  it('ignore orders meant for other contracts', () => {
    const g = createGame(1, 0);
    expect(reduce(g, { type: 'fireSupport' })).toBe(g);
    expect(reduce(g, { type: 'buySentry' })).toBe(g);
  });
});
