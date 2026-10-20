import { describe, it, expect } from 'vitest';
import { createMission, TERRAFORM_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { COLONIST_WAVES, LINES, SPEC_REVISIONS } from '../../src/data/terraform/systems';
import { TERRAFORM_UPGRADES } from '../../src/data/terraform/upgrades';
import {
  canThaw,
  climateTarget,
  colonyIncomeMultiplier,
  habitability,
  HUMAN_CLIMATE,
  incomeRate,
  isAutoBalanced,
  progress,
  thawWave,
  toggleBalancer,
  WAVE_HABITABILITY,
  WAVE_SIZES,
  wavesReady,
} from '../../src/mission/terraform/economy';
import { SCENARIOS } from '../../src/mission/registry';

type T = MissionOf<'terraform', 'organism'>;
const fresh = (patch: Partial<T> = {}): T => ({ ...createMission(TERRAFORM_MISSION_CONFIG, 1), ...patch });
const human = () => ({ atmosphere: HUMAN_CLIMATE.atmosphere, heat: HUMAN_CLIMATE.heat, water: HUMAN_CLIMATE.water });
/** Enough processing for the first few milestones. */
const developed = (patch: Partial<T> = {}) => fresh({ processed: 1e9, ...patch });
const run = (m: T, seconds: number) => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1);
  return next;
};
const balancer = TERRAFORM_UPGRADES.find((u) => u.effect.kind === 'autoBalance')!;

describe('climate', () => {
  it('starts as a dead world: no air, 61 K, no water, uninhabitable', () => {
    const m = fresh();
    expect(m.climate).toEqual({ atmosphere: 0, heat: 61, water: 0 });
    expect(habitability(m)).toBe(0);
  });

  it('heads toward the human ideal when processing is balanced like the first spec and the project is advanced', () => {
    const target = climateTarget(developed());
    expect(target.atmosphere).toBeCloseTo(HUMAN_CLIMATE.atmosphere, 0);
    expect(target.heat).toBeCloseTo(HUMAN_CLIMATE.heat, 0);
    expect(target.water).toBeCloseTo(HUMAN_CLIMATE.water, 0);
  });

  it('runs hot and wet, and thin, when processing follows the final spec', () => {
    // Processors running in the final spec's proportions (10 / 40 / 50), with power to spare.
    const late = developed({
      processed: 1e15,
      processors: { ...fresh().processors, cracker: 10, emitter: 40, melter: 50 },
      reactors: { ...fresh().reactors, cells: 400 },
      allocation: { atmosphere: 1, heat: 4, water: 5 },
    });
    expect(progress(late)).toBeGreaterThan(SPEC_REVISIONS.at(-1)!.at);
    const target = climateTarget(late);
    expect(target.heat).toBeGreaterThan(HUMAN_CLIMATE.heat + 15);
    expect(target.water).toBeGreaterThan(HUMAN_CLIMATE.water + 15);
    expect(target.atmosphere).toBeLessThan(HUMAN_CLIMATE.atmosphere / 2);
  });

  it('drifts toward its target over minutes, not instantly', () => {
    const m = developed();
    const soon = run(m, 10);
    const later = run(m, 600);
    expect(soon.climate.heat).toBeGreaterThan(m.climate.heat);
    expect(soon.climate.heat).toBeLessThan(later.climate.heat);
    expect(later.climate.heat).toBeCloseTo(climateTarget(m).heat, -1);
  });

  it('measures habitability by the worst reading against the human ideal', () => {
    expect(habitability(fresh({ climate: human() }))).toBeCloseTo(1);
    expect(habitability(fresh({ climate: { ...human(), heat: 340 } }))).toBeLessThan(0.9);
  });
});

describe('thawing colonists (the player decides)', () => {
  it('certifies waves ready at progress milestones, but thaws nobody on its own', () => {
    const m = run(developed({ climate: human() }), 30);
    expect(wavesReady(m)).toBeGreaterThan(0);
    expect(m.wavesThawed).toBe(0);
    expect(m.colonists).toBe(0);
  });

  it('can only thaw a ready wave once habitability meets that wave\'s bar', () => {
    const habitable = developed({ climate: human() });
    expect(canThaw(habitable)).toBe(true);
    const harsh = developed({ climate: { atmosphere: 10, heat: 120, water: 5 } });
    expect(habitability(harsh)).toBeLessThan(WAVE_HABITABILITY[0]!);
    expect(canThaw(harsh)).toBe(false);
    expect(thawWave(harsh)).toBe(harsh);
    expect(canThaw(fresh({ climate: human() }))).toBe(false);
  });

  it('thaws the next wave: colonists arrive, and the ledger says so', () => {
    const m = thawWave(developed({ climate: human() }));
    expect(m.wavesThawed).toBe(1);
    expect(m.colonists).toBe(WAVE_SIZES[0]);
    expect(m.log.at(-1)!.text).toMatch(/WAVE 1/);
  });

  it('pays for colonists in proportion to how livable the planet is', () => {
    const thawed = thawWave(developed({ climate: human() }));
    expect(colonyIncomeMultiplier(thawed)).toBeGreaterThan(1);
    const sickly = { ...thawed, climate: { ...human(), heat: 150 } };
    expect(colonyIncomeMultiplier(sickly)).toBeLessThan(colonyIncomeMultiplier(thawed));
    expect(incomeRate(thawed)).toBeGreaterThanOrEqual(incomeRate({ ...thawed, wavesThawed: 0, colonists: 0 }));
  });
});

describe('colonists in a hostile climate', () => {
  const settled = () => ({ ...thawWave(developed({ climate: human() })), climate: { atmosphere: 20, heat: 330, water: 98 } });

  it('sicken and die when habitability falls below 40%', () => {
    const m = settled();
    expect(habitability(m)).toBeLessThan(0.4);
    const later = run({ ...m, processors: { ...m.processors } }, 600);
    expect(later.colonistsLost).toBeGreaterThan(0);
    expect(later.colonists).toBe(WAVE_SIZES[0]! - later.colonistsLost);
    expect(later.log.some((e) => /mortality/i.test(e.text))).toBe(true);
  });

  it('come to no harm in a livable climate', () => {
    expect(run(thawWave(developed({ climate: human() })), 300).colonistsLost).toBe(0);
  });
});

describe("WARDEN's load balancer follows the spec, not the colony", () => {
  it('can be switched off to take the allocation back, and on again', () => {
    const m = fresh({ upgrades: [balancer.id] });
    expect(isAutoBalanced(m)).toBe(true);
    const manual = toggleBalancer(m);
    expect(isAutoBalanced(manual)).toBe(false);
    expect(isAutoBalanced(toggleBalancer(manual))).toBe(true);
  });

  it('cannot be toggled before it is installed', () => {
    const m = fresh();
    expect(toggleBalancer(m)).toBe(m);
  });
});

describe('the terminus knows who is on the surface', () => {
  it('describes the colony at stake', () => {
    const m = { ...thawWave(developed({ climate: human() })), colonistsLost: 37 };
    const stakes = SCENARIOS.terraform.stakes?.(m) ?? '';
    expect(stakes).toMatch(String(m.colonists));
    expect(stakes).toMatch(/37/);
  });

  it('has nothing to add on an extraction contract', () => {
    expect(SCENARIOS.extraction.stakes).toBeUndefined();
  });
});

describe('the table', () => {
  it('has a size and a habitability bar for every wave, rising', () => {
    expect(WAVE_SIZES).toHaveLength(COLONIST_WAVES.length);
    expect(WAVE_HABITABILITY).toHaveLength(COLONIST_WAVES.length);
    for (let i = 1; i < WAVE_HABITABILITY.length; i++) expect(WAVE_HABITABILITY[i]!).toBeGreaterThanOrEqual(WAVE_HABITABILITY[i - 1]!);
    for (const l of LINES) expect(HUMAN_CLIMATE[l.id]).toBeGreaterThan(0);
  });
});
