import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';

/** The default contract: extraction with the organism horror. */
type MissionState = MissionOf<'extraction', 'organism'>;
import { tickDirectives, directiveProgress, DIRECTIVE_COOLDOWN } from '../../src/mission/directives';
import { tickMission } from '../../src/mission/tick';
import { DIRECTIVES } from '../../src/data/extraction/directives';
import { ext } from '../helpers';

const first = DIRECTIVES[0]!;
const fresh = (patch: Partial<MissionState> = {}): MissionState => ({
  ...createMission(DEFAULT_MISSION_CONFIG, 1),
  ...patch,
});
const issued = () => tickDirectives(fresh({ lifetimeCredits: first.unlockCredits }));

describe('issuing directives', () => {
  it('waits until the first directive unlocks', () => {
    expect(tickDirectives(fresh()).directive).toBeNull();
  });

  it('issues the first directive and transmits it to the log', () => {
    const m = issued();
    expect(m.directive?.id).toBe(first.id);
    const last = m.log.at(-1)!;
    expect(last.kind).toBe('corp');
    expect(last.text).toContain(first.title);
  });

  it('records the starting point so progress counts from issue time', () => {
    const m = issued();
    expect(directiveProgress(m)).toEqual({ current: 0, target: first.goal.target });
  });
});

describe('resolving directives', () => {
  it('completes when the goal is met, paying the reward', () => {
    let m = issued();
    m = { ...ext(m), lifetimeOre: ext(m).lifetimeOre + first.goal.target, credits: 0 };
    m = tickDirectives(m);
    expect(m.directive).toBeNull();
    expect(m.directiveResults[first.id]).toBe('completed');
    expect(m.credits).toBe(first.reward);
    expect(m.log.at(-1)!.text).toMatch(/complete/i);
  });

  it('lapses when time runs out', () => {
    let m = issued();
    m = tickDirectives({ ...m, elapsed: m.elapsed + first.duration + 1 });
    expect(m.directive).toBeNull();
    expect(m.directiveResults[first.id]).toBe('failed');
    expect(m.log.at(-1)!.text).toMatch(/lapsed/i);
  });

  it('waits a cooldown before issuing the next one', () => {
    let m = issued();
    m = tickDirectives({ ...ext(m), lifetimeOre: 1e12, lifetimeCredits: 1e12, generators: Object.fromEntries(Object.keys(ext(m).generators).map((k) => [k, 1000])) });
    expect(m.directive).toBeNull();
    m = tickDirectives({ ...m, elapsed: m.elapsed + DIRECTIVE_COOLDOWN - 1 });
    expect(m.directive).toBeNull();
    m = tickDirectives({ ...m, elapsed: m.elapsed + 2 });
    expect(m.directive?.id).toBe(DIRECTIVES[1]!.id);
  });

  it('never reissues a resolved directive', () => {
    let m = issued();
    m = tickDirectives({ ...m, elapsed: m.elapsed + first.duration + 1 });
    m = tickDirectives({ ...m, elapsed: m.elapsed + DIRECTIVE_COOLDOWN + 1 });
    expect(m.directive?.id).not.toBe(first.id);
  });
});

describe('progress', () => {
  it('is never negative, even if a counter is somehow below its baseline', () => {
    const m = fresh({ directive: { id: first.id, issuedAt: 0, baseline: 500 }, lifetimeOre: 100 });
    expect(directiveProgress(m).current).toBe(0);
  });
});

describe('goal kinds', () => {
  it('level goals count how many of something are owned in total', () => {
    const d = DIRECTIVES.find((x) => x.goal.mode === 'level')!;
    const generator = d.goal.metric.replace('gen:', '');
    const m = fresh({
      directive: { id: d.id, issuedAt: 0, baseline: 0 },
      generators: { ...fresh().generators, [generator]: 2 },
    });
    expect(directiveProgress(m).current).toBe(2);
  });

  it('credit goals count credits refined since issue, whatever the scenario', () => {
    const d = DIRECTIVES.find((x) => x.goal.metric === 'credits')!;
    const m = fresh({ directive: { id: d.id, issuedAt: 0, baseline: 100 }, lifetimeCredits: 350 });
    expect(directiveProgress(m).current).toBe(250);
  });
});

describe('integration with the mission tick', () => {
  it('tracks refined credits over the mission lifetime', () => {
    const m = tickMission(fresh({ ore: 10 }), 1);
    expect(m.lifetimeCredits).toBeCloseTo(5);
  });

  it('issues directives as part of ticking', () => {
    expect(tickMission(fresh({ lifetimeCredits: first.unlockCredits }), 0.1).directive?.id).toBe(first.id);
  });
});

describe('directives for the late acts', () => {
  const late = DIRECTIVES.filter((d) => (d.minAct ?? 1) >= 3);
  const done = Object.fromEntries(DIRECTIVES.filter((d) => !d.minAct).map((d) => [d.id, 'completed' as const]));

  it('holds the darker orders back until the discovery, however rich the contract', () => {
    expect(late.length).toBeGreaterThanOrEqual(3);
    const rich = fresh({ lifetimeCredits: 1e15, act: 2, directiveResults: done });
    expect(tickDirectives(rich).directive).toBeNull();
    const after = tickDirectives({ ...rich, act: 3 });
    expect(after.directive?.id).toBe(late[0]!.id);
  });

  it('reaches act 4 with orders of its own', () => {
    expect(DIRECTIVES.some((d) => d.minAct === 4)).toBe(true);
  });
});
