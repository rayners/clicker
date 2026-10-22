import { progress as haulageProgress } from '../../src/mission/haulage/economy';
import type { MissionOf } from '../../src/mission/state';
import { describe, it, expect } from 'vitest';
import { createGame, newGame } from '../../src/core/game';
import { applyScenario, debugSpeed, grantCredits, SCENARIOS, storySummary } from '../../src/core/debug';
import { depth } from '../../src/mission/extraction/progress';
import { progress } from '../../src/mission/terraform/economy';
import { progress as securityProgress } from '../../src/mission/security/economy';
import { held } from '../../src/shared/ground';
import { progress as salvageProgress, shoringHold, holdNeeded } from '../../src/mission/salvage/economy';
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

  it('starts a fresh haulage contract', () => {
    const g = applyScenario(base(), 'haulage');
    expect(g.mission.scenario).toBe('haulage');
    expect(g.mission.elapsed).toBe(0);
  });

  it('starts a fresh salvage contract', () => {
    const g = applyScenario(base(), 'salvage');
    expect(g.mission.scenario).toBe('salvage');
    expect(g.mission.elapsed).toBe(0);
  });

  it('jumps a salvage contract into act 2 with the forward compartments open and braced', () => {
    const m = applyScenario(base(), 'sal-act2').mission as MissionOf<'salvage', 'organism'>;
    expect(m.scenario).toBe('salvage');
    expect(m.act).toBe(2);
    expect(salvageProgress(m)).toBeGreaterThanOrEqual(1000);
    expect(held(m.ground)).toBeGreaterThan(4);
    expect(shoringHold(m)).toBeGreaterThanOrEqual(holdNeeded(m));
    expect(Object.values(m.cutters).some((n) => n > 0)).toBe(true);
  });

  it('jumps a haulage contract into act 2 with a train under way', () => {
    const m = applyScenario(base(), 'haul-act2').mission as MissionOf<'haulage', 'organism'>;
    expect(m.scenario).toBe('haulage');
    expect(m.act).toBe(2);
    expect(haulageProgress(m)).toBeGreaterThanOrEqual(1000);
    expect(Object.values(m.engines).some((n) => n > 0)).toBe(true);
    expect(Object.values(m.cars).some((n) => n > 0)).toBe(true);
    expect(m.fuel).toBeGreaterThan(0);
  });

  it('starts a fresh overland haul', () => {
    const g = applyScenario(base(), 'overland');
    expect(g.mission.scenario).toBe('overland');
    expect(g.mission.horror).toBe('quiet');
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

describe('debug extras', () => {
  it('reads a time-scale multiplier from the address, within sane bounds', () => {
    expect(debugSpeed('?speed=10')).toBe(10);
    expect(debugSpeed('?speed=1000')).toBe(100);
    expect(debugSpeed('?speed=0.1')).toBe(1);
    expect(debugSpeed('?debug=act2')).toBe(1);
    expect(debugSpeed('?speed=fast')).toBe(1);
  });

  it('grants credits to the running contract', () => {
    const g = base();
    expect(grantCredits(g, 5_000).mission.credits).toBe(g.mission.credits + 5_000);
    expect(grantCredits(g, 5_000).mission.lifetimeCredits).toBe(g.mission.lifetimeCredits);
    expect(grantCredits(g, Number.NaN)).toBe(g);
  });

  it('summarises the story so far: act, flags and the latest beats', () => {
    const g = applyScenario(base(), 'act3');
    const lines = storySummary(g);
    expect(lines[0]).toMatch(/ACT 3/);
    expect(lines.join('\n')).toMatch(/specimens/);
    expect(lines.join('\n')).toMatch(/a3-special-projects/);
  });

  it('jumps to an extraction contract for the act jumps, whatever contract was running', () => {
    const onSalvage = applyScenario(base(), 'salvage');
    expect(applyScenario(onSalvage, 'act3').mission.scenario).toBe('extraction');
    expect(applyScenario(onSalvage, 'act3').mission.act).toBe(3);
  });
});
