import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import {
  isSpecialProjectsUnlocked,
  rigCost,
  buyRig,
  RIG_RATE,
  fundingMultiplier,
  reinforce,
  reinforceCost,
  REINFORCE_AMOUNT,
  containmentLevelCost,
  buyContainmentLevel,
  tickContainment,
  breach,
  vent,
  ventCost,
  BREACH_RESET_INTEGRITY,
} from '../../src/mission/containment';
import { tickMission } from '../../src/mission/tick';
import { oreRate } from '../../src/mission/economy';
import { crewStatus, wakeCrew, awakeCount } from '../../src/mission/crew';
import { GENERATORS } from '../../src/data/generators';
import { CREW } from '../../src/data/crew';

const unlocked = (patch: Partial<MissionState> = {}): MissionState => ({
  ...createMission(DEFAULT_MISSION_CONFIG, 42),
  flags: ['specimens'],
  credits: 1e15,
  lifetimeOre: 1e10,
  ...patch,
});

const totalGenerators = (m: MissionState) => Object.values(m.generators).reduce((a, b) => a + b, 0);
const lostCrew = (m: MissionState) => CREW.filter((c) => crewStatus(m, c.id) === 'lost').length;

describe('special projects', () => {
  it('unlocks with the specimens flag set by the story', () => {
    expect(isSpecialProjectsUnlocked(createMission(DEFAULT_MISSION_CONFIG, 1))).toBe(false);
    expect(isSpecialProjectsUnlocked(unlocked())).toBe(true);
  });
});

describe('recovery rigs', () => {
  it('are bought with credits and get more expensive', () => {
    const m = unlocked();
    const after = buyRig(m);
    expect(after.rigs).toBe(1);
    expect(after.credits).toBe(m.credits - rigCost(m));
    expect(rigCost(after)).toBeGreaterThan(rigCost(m));
  });

  it('cannot be bought before special projects or without credits', () => {
    const locked = { ...unlocked(), flags: [] };
    expect(buyRig(locked)).toBe(locked);
    const poor = unlocked({ credits: 0 });
    expect(buyRig(poor)).toBe(poor);
  });

  it('recover specimens over time', () => {
    const m = tickContainment(unlocked({ rigs: 2 }), 100);
    expect(m.specimens).toBeCloseTo(2 * RIG_RATE * 100);
    expect(m.specimensRecovered).toBeCloseTo(2 * RIG_RATE * 100);
  });
});

describe('special projects funding', () => {
  it('multiplies all output for every whole specimen held', () => {
    expect(fundingMultiplier(unlocked({ specimens: 0.9 }))).toBe(1);
    expect(fundingMultiplier(unlocked({ specimens: 4 }))).toBeGreaterThan(fundingMultiplier(unlocked({ specimens: 2 })));
    const gens = { ...unlocked().generators, drone: 10 };
    expect(oreRate(unlocked({ specimens: 4, generators: gens }))).toBeCloseTo(
      oreRate(unlocked({ generators: gens })) * fundingMultiplier(unlocked({ specimens: 4 })),
    );
  });
});

describe('containment', () => {
  it('starts at full integrity', () => {
    expect(createMission(DEFAULT_MISSION_CONFIG, 1).integrity).toBe(100);
  });

  it('is strained by held specimens, and only by them', () => {
    expect(tickContainment(unlocked({ specimens: 0 }), 100).integrity).toBe(100);
    expect(tickContainment(unlocked({ specimens: 5 }), 10).integrity).toBeLessThan(100);
  });

  it('strains more slowly at higher containment levels', () => {
    const base = tickContainment(unlocked({ specimens: 5 }), 10).integrity;
    const upgraded = tickContainment(buyContainmentLevel(unlocked({ specimens: 5 })), 10).integrity;
    expect(upgraded).toBeGreaterThan(base);
  });

  it('containment levels cost credits and get more expensive', () => {
    const m = unlocked();
    const after = buyContainmentLevel(m);
    expect(after.containmentLevel).toBe(1);
    expect(after.credits).toBe(m.credits - containmentLevelCost(m));
    expect(containmentLevelCost(after)).toBeGreaterThan(containmentLevelCost(m));
  });

  it('can be reinforced for credits, up to full integrity', () => {
    const m = unlocked({ integrity: 50 });
    const after = reinforce(m);
    expect(after.integrity).toBe(50 + REINFORCE_AMOUNT);
    expect(after.credits).toBe(m.credits - reinforceCost(m));
    expect(reinforce(unlocked({ integrity: 95 })).integrity).toBe(100);
    const poor = unlocked({ integrity: 50, credits: 0 });
    expect(reinforce(poor)).toBe(poor);
  });
});

describe('breaches', () => {
  it('release a share of held specimens as loose contacts and reset integrity', () => {
    const m = breach(unlocked({ specimens: 10, integrity: 0 }));
    expect(m.contacts).toBe(3);
    expect(m.specimens).toBe(7);
    expect(m.integrity).toBe(BREACH_RESET_INTEGRITY);
    expect(m.breaches).toBe(1);
    expect(m.log.at(-1)!.kind).toBe('anomaly');
  });

  it('always release at least one', () => {
    expect(breach(unlocked({ specimens: 1 })).contacts).toBe(1);
  });

  it('happen when integrity runs out during a tick', () => {
    const m = tickContainment(unlocked({ specimens: 10, integrity: 0.01 }), 1);
    expect(m.breaches).toBe(1);
    expect(m.contacts).toBeGreaterThan(0);
  });
});

describe('incidents caused by loose contacts', () => {
  const infested = (contacts: number) =>
    unlocked({
      contacts,
      generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 20])),
    });

  const run = (m: MissionState, seconds: number) => {
    for (let i = 0; i < seconds; i++) m = tickContainment(m, 1);
    return m;
  };

  it('do not happen without contacts', () => {
    const m = run(infested(0), 3000);
    expect(totalGenerators(m)).toBe(totalGenerators(infested(0)));
    expect(lostCrew(m)).toBe(0);
  });

  it('destroy equipment and take crew over time', () => {
    const m = run(infested(6), 3000);
    expect(totalGenerators(m)).toBeLessThan(totalGenerators(infested(6)));
    expect(lostCrew(m)).toBeGreaterThan(0);
  });

  it('are deterministic for the same seed', () => {
    expect(run(infested(4), 500)).toEqual(run(infested(4), 500));
  });
});

describe('lost crew', () => {
  const withLost = () => {
    const m = unlocked();
    return { ...m, crew: { ...m.crew, sorensen: { status: 'lost' as const, fatigue: 0 } } };
  };

  it('cannot be woken and do not count as awake', () => {
    const m = withLost();
    expect(crewStatus(m, 'sorensen')).toBe('lost');
    expect(wakeCrew(m, 'sorensen')).toBe(m);
    expect(awakeCount(m)).toBe(0);
  });
});

describe('venting decks', () => {
  it('kills most loose contacts, at a price', () => {
    const m = unlocked({ contacts: 100 });
    const after = vent(m);
    expect(after.contacts).toBeGreaterThanOrEqual(20);
    expect(after.contacts).toBeLessThanOrEqual(60);
    expect(after.credits).toBe(m.credits - ventCost(m));
    expect(ventCost(after)).toBeGreaterThan(ventCost(m));
  });

  it('can kill crew who are awake on the vented decks', () => {
    let losses = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let m = unlocked({ contacts: 5, rng: seed });
      for (const c of CREW.slice(0, 3)) m = wakeCrew(m, c.id);
      losses += lostCrew(vent(m));
    }
    expect(losses).toBeGreaterThan(0);
    expect(losses).toBeLessThan(60);
  });

  it('is refused with no contacts or no credits', () => {
    const clear = unlocked({ contacts: 0 });
    expect(vent(clear)).toBe(clear);
    const poor = unlocked({ contacts: 3, credits: 0 });
    expect(vent(poor)).toBe(poor);
  });
});

describe('integration', () => {
  it('ticks containment as part of the mission', () => {
    expect(tickMission(unlocked({ rigs: 1 }), 10).specimens).toBeGreaterThan(0);
  });
});
