import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import {
  wakeCrew,
  sleepCrew,
  isCrewUnlocked,
  awakeCount,
  crewStatus,
  MAX_AWAKE,
  CRYO_UNLOCK_ORE,
  FATIGUE_SECONDS,
  RECOVERY_SECONDS,
} from '../../src/mission/crew';
import { tickMission } from '../../src/mission/tick';
import { clickPower, oreRate, refineryCapacity } from '../../src/mission/economy';
import { CREW } from '../../src/data/crew';
import { GENERATORS } from '../../src/data/generators';

const byBoost = (kind: string) => CREW.find((c) => c.boost.kind === kind)!;
const fresh = (patch: Partial<MissionState> = {}): MissionState => ({
  ...createMission(DEFAULT_MISSION_CONFIG, 1),
  lifetimeOre: CRYO_UNLOCK_ORE,
  credits: 1e9,
  ...patch,
});

describe('cryo bay access', () => {
  it('opens once enough ore has been extracted', () => {
    expect(isCrewUnlocked(fresh({ lifetimeOre: CRYO_UNLOCK_ORE - 1 }))).toBe(false);
    expect(isCrewUnlocked(fresh())).toBe(true);
  });

  it('starts with the whole crew in cryostasis and fully rested', () => {
    const m = fresh();
    for (const c of CREW) expect(m.crew[c.id]).toEqual({ status: 'cryo', fatigue: 0 });
  });
});

describe('waking crew', () => {
  const tech = byBoost('clickMultiplier');

  it('costs the thaw price and marks them awake', () => {
    const m = wakeCrew(fresh({ credits: tech.thawCost + 1 }), tech.id);
    expect(m.crew[tech.id]!.status).toBe('awake');
    expect(m.credits).toBe(1);
  });

  it('logs something the crew member says on waking', () => {
    const before = fresh();
    const m = wakeCrew(before, tech.id);
    const entry = m.log.at(-1)!;
    expect(entry.kind).toBe('crew');
    expect(tech.wakeLines.some((line) => entry.text.includes(line))).toBe(true);
    expect(m.rng).not.toBe(before.rng);
  });

  it('is refused when locked, unaffordable, already awake, or life support is full', () => {
    const locked = fresh({ lifetimeOre: 0 });
    expect(wakeCrew(locked, tech.id)).toBe(locked);
    const poor = fresh({ credits: 0 });
    expect(wakeCrew(poor, tech.id)).toBe(poor);
    const awake = wakeCrew(fresh(), tech.id);
    expect(wakeCrew(awake, tech.id)).toBe(awake);

    let full = fresh();
    for (const c of CREW.slice(0, MAX_AWAKE)) full = wakeCrew(full, c.id);
    expect(awakeCount(full)).toBe(MAX_AWAKE);
    const extra = CREW[MAX_AWAKE]!;
    expect(wakeCrew(full, extra.id)).toBe(full);
  });

  it('can return them to cryo for free', () => {
    const m = sleepCrew(wakeCrew(fresh(), tech.id), tech.id);
    expect(m.crew[tech.id]!.status).toBe('cryo');
  });
});

describe('crew boosts', () => {
  it('apply while a crew member is awake', () => {
    const tech = byBoost('clickMultiplier');
    expect(clickPower(wakeCrew(fresh(), tech.id))).toBeCloseTo(tech.boost.value);

    const engineer = byBoost('refineryMultiplier');
    expect(refineryCapacity(wakeCrew(fresh(), engineer.id))).toBeCloseTo(refineryCapacity(fresh()) * engineer.boost.value);

    const captain = byBoost('globalMultiplier');
    const gens = { ...fresh().generators, [GENERATORS[0]!.id]: 10 };
    expect(oreRate(wakeCrew(fresh({ generators: gens }), captain.id))).toBeCloseTo(
      oreRate(fresh({ generators: gens })) * captain.boost.value,
    );
  });

  it('do not apply while in cryo', () => {
    expect(clickPower(fresh())).toBe(1);
  });
});

describe('fatigue', () => {
  const tech = byBoost('clickMultiplier');

  it('builds while awake until the crew member is exhausted', () => {
    let m = wakeCrew(fresh(), tech.id);
    m = tickMission(m, FATIGUE_SECONDS / 2);
    expect(m.crew[tech.id]!.fatigue).toBeCloseTo(50);
    expect(crewStatus(m, tech.id)).toBe('awake');
    m = tickMission(m, FATIGUE_SECONDS);
    expect(m.crew[tech.id]!.fatigue).toBe(100);
    expect(crewStatus(m, tech.id)).toBe('exhausted');
  });

  it('cancels the boost when exhausted, and logs it once', () => {
    let m = wakeCrew(fresh(), tech.id);
    m = tickMission(m, FATIGUE_SECONDS + 1);
    expect(clickPower(m)).toBe(1);
    const exhaustedEntries = (s: MissionState) => s.log.filter((e) => e.text.includes(tech.exhaustedLine)).length;
    expect(exhaustedEntries(m)).toBe(1);
    m = tickMission(m, 10);
    expect(exhaustedEntries(m)).toBe(1);
  });

  it('recovers in cryo', () => {
    let m = tickMission(wakeCrew(fresh(), tech.id), FATIGUE_SECONDS);
    m = tickMission(sleepCrew(m, tech.id), RECOVERY_SECONDS / 2);
    expect(m.crew[tech.id]!.fatigue).toBeCloseTo(50);
    m = tickMission(m, RECOVERY_SECONDS);
    expect(m.crew[tech.id]!.fatigue).toBe(0);
  });

  it('builds more slowly while the medic is awake', () => {
    const medic = byBoost('fatigueMultiplier');
    let m = wakeCrew(wakeCrew(fresh(), medic.id), tech.id);
    m = tickMission(m, FATIGUE_SECONDS / 2);
    expect(m.crew[tech.id]!.fatigue).toBeCloseTo(50 * medic.boost.value);
  });
});
