import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, TERRAFORM_MISSION_CONFIG as TERRAFORM_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { LINES, PROCESSORS, REACTORS, SPEC_REVISIONS, type Line } from '../../src/data/terraform/systems';
import { TERRAFORM_UPGRADES } from '../../src/data/terraform/upgrades';
import {
  allocate,
  autoSurgeRate,
  buyProcessor,
  buyReactor,
  buyTerraformUpgrade,
  colonistWaves,
  incomeRate,
  isProcessorRevealed,
  lineStates,
  planetReadings,
  power,
  processorCost,
  progress,
  reactorCost,
  spec,
  specMatch,
  surge,
  surgePower,
  throughput,
  COST_GROWTH,
  REACTOR_COST_GROWTH,
  BASE_POWER,
} from '../../src/mission/terraform/economy';
import { SCENARIOS } from '../../src/mission/registry';

type T = MissionOf<'terraform', 'organism'>;
const fresh = (patch: Partial<T> = {}): T => ({ ...createMission(TERRAFORM_CONFIG, 1), ...patch });
const tier1 = (line: Line) => PROCESSORS.find((p) => p.line === line)!;
const withProcessors = (counts: Partial<Record<string, number>>, patch: Partial<T> = {}) =>
  fresh({ processors: { ...fresh().processors, ...counts } as Record<string, number>, ...patch });
const own = (m: T, ...ids: string[]) => ({ ...m, upgrades: [...m.upgrades, ...ids] });
const upgrade = (kind: string) => TERRAFORM_UPGRADES.find((u) => u.effect.kind === kind)!;
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe('a new terraforming contract', () => {
  it('is a terraform scenario with nothing built and the first spec loaded into the power allocation', () => {
    const m = fresh();
    expect(m.scenario).toBe('terraform');
    expect(sum(m.processors)).toBe(0);
    expect(sum(m.reactors)).toBe(0);
    for (const line of LINES) expect(m.allocation[line.id]).toBe(Math.round(SPEC_REVISIONS[0]!.targets[line.id] * 10));
    expect(power(m)).toBe(BASE_POWER);
  });

  it('boots WARDEN at the processing station, not on a ship', () => {
    expect(fresh().log.map((e) => e.text).join(' ')).toMatch(/STATION/);
  });
});

describe('manual surge (the click)', () => {
  it('processes a burst exactly on spec, earning credits and terraforming progress', () => {
    const m = surge(fresh());
    expect(m.credits).toBeCloseTo(surgePower(fresh()));
    expect(m.processed).toBeCloseTo(surgePower(fresh()));
    for (const line of LINES) expect(m.lineTotals[line.id]).toBeCloseTo(surgePower(fresh()) * spec(fresh())[line.id]);
  });
});

describe('building', () => {
  it('buys reactors and processors with credits; processors get 15% dearer, reactors faster (power is the brake)', () => {
    const r = REACTORS[0]!;
    const p = tier1('atmosphere');
    expect(COST_GROWTH).toBe(1.15);
    let m = fresh({ credits: 1e6 });
    m = buyReactor(m, r.id);
    m = buyProcessor(m, p.id);
    expect(m.reactors[r.id]).toBe(1);
    expect(m.processors[p.id]).toBe(1);
    expect(m.credits).toBe(1e6 - r.baseCost - p.baseCost);
    expect(REACTOR_COST_GROWTH).toBeGreaterThan(COST_GROWTH);
    expect(reactorCost(r, 1)).toBe(Math.ceil(r.baseCost * REACTOR_COST_GROWTH));
    expect(processorCost(p, 3)).toBe(Math.ceil(p.baseCost * 1.15 ** 3));
  });

  it('refuses purchases it cannot afford', () => {
    const m = fresh({ credits: 0 });
    expect(buyReactor(m, REACTORS[0]!.id)).toBe(m);
    expect(buyProcessor(m, tier1('heat').id)).toBe(m);
  });

  it("reveals each line's processors one tier at a time", () => {
    const line = PROCESSORS.filter((p) => p.line === 'water');
    expect(isProcessorRevealed(fresh(), line[0]!)).toBe(true);
    expect(isProcessorRevealed(fresh(), line[1]!)).toBe(false);
    expect(isProcessorRevealed(withProcessors({ [line[0]!.id]: 1 }), line[1]!)).toBe(true);
  });

  it('adds reactor output on top of the station baseline', () => {
    const r = REACTORS[0]!;
    expect(power({ ...fresh(), reactors: { ...fresh().reactors, [r.id]: 3 } })).toBeCloseTo(BASE_POWER + 3 * r.mw);
  });
});

describe('power allocation (the balancing game)', () => {
  it('moves power between lines in 10% steps, taking from the largest other line when nothing is idle', () => {
    const m = allocate(fresh(), 'heat', +1);
    expect(m.allocation.heat).toBe(fresh().allocation.heat + 1);
    expect(m.allocation.atmosphere).toBe(fresh().allocation.atmosphere - 1);
  });

  it('takes from idle power first, and returns power to idle when a line is turned down', () => {
    const down = allocate(fresh(), 'water', -1);
    expect(sum(down.allocation)).toBe(9);
    const up = allocate(down, 'heat', +1);
    expect(sum(up.allocation)).toBe(10);
    expect(up.allocation.atmosphere).toBe(fresh().allocation.atmosphere);
  });

  it('never allocates below 0% or more than 100% in total', () => {
    let m = fresh();
    for (let i = 0; i < 20; i++) m = allocate(m, 'water', -1);
    expect(m.allocation.water).toBe(0);
    for (let i = 0; i < 20; i++) m = allocate(m, 'heat', +1);
    expect(sum(m.allocation)).toBe(10);
  });

  it('runs each line at the lesser of its processor capacity and its share of power', () => {
    const p = tier1('atmosphere');
    const starved = withProcessors({ [p.id]: 1000 });
    const share = (starved.allocation.atmosphere / 10) * power(starved);
    expect(throughput(starved).atmosphere).toBeCloseTo(share);
    expect(lineStates(starved).atmosphere).toBe('power-limited');

    const idle = withProcessors({ [p.id]: 1 });
    expect(throughput(idle).atmosphere).toBeCloseTo(p.rate);
    expect(lineStates(idle).atmosphere).toBe('processor-limited');
  });
});

describe('spec match and income', () => {
  const balanced = () => {
    const s = spec(fresh());
    return withProcessors(
      Object.fromEntries(LINES.map((l) => [tier1(l.id).id, Math.round(s[l.id] * 10)])),
      { reactors: { ...fresh().reactors, [REACTORS[0]!.id]: 50 } },
    );
  };

  it('is 100% when throughput is in exactly the proportions the spec asks for', () => {
    expect(specMatch(balanced())).toBeCloseTo(1);
  });

  it('is the overlap between the throughput mix and the spec when lopsided', () => {
    const m = withProcessors({ [tier1('atmosphere').id]: 10 }, { reactors: { ...fresh().reactors, [REACTORS[0]!.id]: 50 } });
    expect(specMatch(m)).toBeCloseTo(spec(m).atmosphere);
  });

  it('pays throughput times spec match, so imbalance costs money immediately', () => {
    const m = withProcessors({ [tier1('atmosphere').id]: 10 }, { reactors: { ...fresh().reactors, [REACTORS[0]!.id]: 50 } });
    const total = sum(throughput(m));
    expect(incomeRate(m)).toBeCloseTo(total * specMatch(m));
    expect(incomeRate(balanced()) / sum(throughput(balanced()))).toBeGreaterThan(incomeRate(m) / total);
  });

  it('earns credits and balanced progress as time passes', () => {
    const m = balanced();
    const next = tickMission(m, 10);
    expect(next.credits - m.credits).toBeCloseTo(incomeRate(m) * 10);
    expect(next.processed - m.processed).toBeCloseTo(incomeRate(m) * 10);
    expect(next.lifetimeCredits).toBeGreaterThan(m.lifetimeCredits);
  });
});

describe('progress and the corporate spec', () => {
  it('measures terraforming progress on the shared story scale from balanced processing', () => {
    expect(progress(fresh())).toBe(0);
    expect(progress(fresh({ processed: 1e6 }))).toBeGreaterThan(progress(fresh({ processed: 1e4 })));
  });

  it('revises the spec as the project advances, keeping every revision a proper split', () => {
    for (const rev of SPEC_REVISIONS) expect(sum(rev.targets)).toBeCloseTo(1);
    const last = SPEC_REVISIONS.at(-1)!;
    const late = fresh({ processed: 1e15 });
    expect(spec(late)).toEqual(last.targets);
    expect(spec(fresh())).toEqual(SPEC_REVISIONS[0]!.targets);
  });

  it('thaws colonist waves at milestones, each adding to income', () => {
    expect(colonistWaves(fresh())).toBe(0);
    const later = fresh({ processed: 1e9 });
    expect(colonistWaves(later)).toBeGreaterThan(0);
  });

  it('reports deep access once the deepest water processor is running', () => {
    const deep = PROCESSORS.filter((p) => p.line === 'water').at(-2)!;
    expect(SCENARIOS.terraform.signals(fresh()).deepAccess).toBe(false);
    expect(SCENARIOS.terraform.signals(withProcessors({ [deep.id]: 1 })).deepAccess).toBe(true);
  });
});

describe('automation upgrades', () => {
  it('autosurge fires surges without the player', () => {
    const m = own(fresh(), upgrade('autoSurge').id);
    expect(autoSurgeRate(m)).toBeGreaterThan(0);
    expect(tickMission(m, 1).processed).toBeCloseTo(autoSurgeRate(m) * surgePower(m));
  });

  it('auto-balance sets the allocation for maximum income, ignoring the manual split', () => {
    const counts = { [tier1('atmosphere').id]: 40, [tier1('heat').id]: 5, [tier1('water').id]: 5 };
    const manual = withProcessors(counts, { reactors: { ...fresh().reactors, [REACTORS[0]!.id]: 3 } });
    const auto = own(manual, upgrade('autoBalance').id);
    expect(incomeRate(auto)).toBeGreaterThan(incomeRate(manual));
    // Never worse than any manual split.
    for (const line of LINES) {
      for (const step of [-1, 1] as const) expect(incomeRate(auto)).toBeGreaterThanOrEqual(incomeRate(allocate(manual, line.id, step)) - 1e-9);
    }
  });

  it('can only be bought once unlocked and affordable', () => {
    const u = TERRAFORM_UPGRADES[0]!;
    expect(buyTerraformUpgrade(fresh({ credits: 1e12 }), u.id).upgrades).toEqual([]);
    const ready = fresh({ credits: 1e12, lifetimeUnits: 1e12 });
    expect(buyTerraformUpgrade(ready, u.id).upgrades).toContain(u.id);
  });
});

describe('horror effects reach terraforming through the generic production multiplier', () => {
  it('Special Projects funding scales processing like it scales mining', () => {
    const m = withProcessors({ [tier1('atmosphere').id]: 10 }, { reactors: { ...fresh().reactors, [REACTORS[0]!.id]: 50 } });
    const funded = { ...m, specimens: 4 };
    expect(sum(throughput(funded))).toBeGreaterThan(sum(throughput(m)));
  });
});

describe('isolation', () => {
  it('runs an extraction and a terraforming contract side by side without sharing state', () => {
    let a = createMission(DEFAULT_MISSION_CONFIG, 1);
    let b = fresh();
    a = tickMission({ ...a, generators: { ...a.generators, drone: 5 } }, 10);
    b = tickMission(surge(b), 10);
    expect(a.scenario).toBe('extraction');
    expect(b.scenario).toBe('terraform');
    expect('ore' in b).toBe(false);
    expect('processors' in a).toBe(false);
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });
});

describe('planet readings', () => {
  it('start at the dead world and approach the final envelope as each line accumulates', () => {
    const dead = planetReadings(fresh());
    expect(dead).toEqual({ atmosphere: 0, heat: 61, water: 0 });
    const done = planetReadings(fresh({ lineTotals: { atmosphere: 1e12, heat: 1e12, water: 1e12 } }));
    expect(done.atmosphere).toBeCloseTo(101.3);
    expect(done.heat).toBeCloseTo(304);
    expect(done.water).toBeCloseTo(96);
  });
});
