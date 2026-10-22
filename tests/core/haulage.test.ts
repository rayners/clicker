import { describe, it, expect } from 'vitest';
import { veteran } from '../helpers';
import { createGame, createProfile, newGame, type GameState } from '../../src/core/game';
import { availableAssignments, missionConfigFor } from '../../src/core/prestige';
import { reduce } from '../../src/core/store';
import { HAULAGE_UPGRADES } from '../../src/data/haulage/upgrades';
import { CARS, ENGINES } from '../../src/data/haulage/systems';
import type { HaulageMission } from '../../src/mission/state';

const haulage = (patch: Partial<HaulageMission> = {}): GameState => {
  const g = reduce(veteran(newGame(1, 0)), { type: 'chooseAssignment', scenario: 'haulage', seed: 1 });
  return { ...g, mission: { ...g.mission, ...patch } as GameState['mission'] };
};
const m = (g: GameState) => g.mission as HaulageMission;

describe('haulage contracts in the game', () => {
  it('are offered once 1 contract has been finished', () => {
    expect(availableAssignments(createProfile())).not.toContain('haulage');
    expect(availableAssignments({ ...createProfile(), contractsCompleted: 1 })).toContain('haulage');
  });

  it('run aboard a commercial tug, named for the cycle', () => {
    const config = missionConfigFor(createProfile(), 'haulage');
    expect(config.scenario).toBe('haulage');
    expect(config.shipName).toBe('Halvorsen Gale');
    expect(missionConfigFor({ ...createProfile(), contractsCompleted: 1 }, 'haulage').shipName).not.toBe(config.shipName);
  });

  it('take player orders: thrusters, engines, cars, the burn, refuelling and the autopilot', () => {
    let g = haulage({ credits: 1e9, delivered: 1e9 });
    g = reduce(g, { type: 'fireThrusters' });
    expect(m(g).travelled).toBeGreaterThan(0);
    g = reduce(g, { type: 'buyEngine', id: ENGINES[0]!.id });
    expect(m(g).engines[ENGINES[0]!.id]).toBe(1);
    g = reduce(g, { type: 'buyCar', id: CARS[0]!.id });
    expect(m(g).cars[CARS[0]!.id]).toBe(1);
    const burn = m(g).burn;
    g = reduce(g, { type: 'shiftBurn', step: 1 });
    expect(m(g).burn).toBe(burn + 1);
    g = reduce({ ...g, mission: { ...m(g), docked: 5 } }, { type: 'refuel' });
    expect(m(g).fuel).toBeGreaterThan(0);
    const ap = HAULAGE_UPGRADES.find((u) => u.effect.kind === 'autopilot')!;
    g = reduce(g, { type: 'buyUpgrade', id: ap.id });
    expect(m(g).upgrades).toContain(ap.id);
    g = reduce(g, { type: 'toggleAutopilot' });
    expect(m(g).autopilotOff).toBe(true);
  });

  it('ignore orders meant for other contracts', () => {
    const g = createGame(1, 0);
    expect(reduce(g, { type: 'fireThrusters' })).toBe(g);
    expect(reduce(g, { type: 'refuel' })).toBe(g);
  });
});
