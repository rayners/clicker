import type { MissionOf } from '../../src/mission/state';
import { describe, it, expect } from 'vitest';
import { createGame, newGame } from '../../src/core/game';
import { applyScenario, SCENARIOS } from '../../src/core/debug';
import { depth } from '../../src/mission/extraction/progress';
import { progress } from '../../src/mission/terraform/economy';
import { progress as securityProgress } from '../../src/mission/security/economy';
import { held } from '../../src/shared/ground';
import { isSpecialProjectsUnlocked } from '../../src/mission/organism/containment';

const base = () => createGame(1, 0);

describe('debug scenarios', () => {
  it('offers a jump to the start of each act', () => {
    expect(SCENARIOS).toEqual(expect.arrayContaining(['act2', 'act3', 'act4', 'terminus']));
  });

  it('act2 lands past the 1,000 m entry point', () => {
    const g = applyScenario(base(), 'act2');
    expect(g.mission.act).toBe(2);
    expect(depth(g.mission as MissionOf<'extraction', 'organism'>)).toBeGreaterThanOrEqual(1000);
  });

  it('starts a fresh terraforming contract, keeping the profile', () => {
    const g = applyScenario(base(), 'terraform');
    expect(g.mission.scenario).toBe('terraform');
    expect(g.mission.elapsed).toBe(0);
    expect(g.profile).toEqual(base().profile);
  });

  it('jumps a terraforming contract into act 2 with a working station', () => {
    const g = applyScenario(base(), 'tf-act2');
    const m = g.mission as MissionOf<'terraform', 'organism'>;
    expect(m.scenario).toBe('terraform');
    expect(m.act).toBe(2);
    expect(progress(m)).toBeGreaterThanOrEqual(1000);
    expect(Object.values(m.processors).some((n) => n > 0)).toBe(true);
  });

  it('starts a fresh security contract', () => {
    const g = applyScenario(base(), 'security');
    expect(g.mission.scenario).toBe('security');
    expect(g.mission.elapsed).toBe(0);
  });

  it('jumps a security contract into act 2 with ground held and a detachment on it', () => {
    const m = applyScenario(base(), 'sec-act2').mission as MissionOf<'security', 'organism'>;
    expect(m.scenario).toBe('security');
    expect(m.act).toBe(2);
    expect(securityProgress(m)).toBeGreaterThanOrEqual(1000);
    expect(held(m.ground)).toBeGreaterThan(4);
    expect(Object.values(m.troopers).some((n) => n > 0)).toBe(true);
  });

  it('act3 opens special projects', () => {
    const g = applyScenario(base(), 'act3');
    expect(g.mission.act).toBe(3);
    expect(isSpecialProjectsUnlocked(g.mission as MissionOf<'extraction', 'organism'>)).toBe(true);
  });

  it('act4 has contacts aboard and tracking on', () => {
    const g = applyScenario(base(), 'act4');
    expect(g.mission.act).toBe(4);
    expect((g.mission as MissionOf<'extraction', 'organism'>).contacts).toBeGreaterThan(0);
    expect(g.mission.flags).toContain('tracker');
  });

  it('terminus offers the ending', () => {
    expect(applyScenario(base(), 'terminus').mission.flags).toContain('terminus');
  });

  it('ignores unknown scenarios', () => {
    const g = base();
    expect(applyScenario(g, 'nope')).toBe(g);
  });
});

describe('debug jumps on a brand-new game', () => {
  it('skip the assignment screen: a jump means "play this now"', () => {
    for (const name of ['act2', 'tf-act2']) expect(applyScenario(newGame(1, 0), name).assigning).toBe(false);
  });
});
