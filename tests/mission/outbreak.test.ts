import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState, type OutbreakMission } from '../../src/mission/state';
import { HORRORS, horrorProductionMultiplier, horrorPressure } from '../../src/mission/horrors';
import { healthy, offShift, shiftQuarantine, tickOutbreak, MAX_QUARANTINE } from '../../src/mission/outbreak/spread';
import type { HorrorHooks } from '../../src/mission/kinds';
import { CREW } from '../../src/data/crew';
import { OUTBREAK_BEATS } from '../../src/data/outbreak/story';

const fresh = (patch: Partial<OutbreakMission> = {}): OutbreakMission =>
  ({ ...createMission({ ...DEFAULT_MISSION_CONFIG, horror: 'outbreak' }, 1), ...patch }) as OutbreakMission;
const noHooks: HorrorHooks = { loseEquipment: () => null };
function run(m: OutbreakMission, seconds: number, hooks = noHooks): OutbreakMission {
  let next = m;
  for (let t = 0; t < seconds; t += 1) next = tickOutbreak(next, 1, hooks);
  return next;
}

describe('the outbreak (Strain KA-11)', () => {
  it('starts every contract with a healthy workforce and nobody isolated', () => {
    const m = fresh();
    expect(m.horror).toBe('outbreak');
    expect(healthy(m)).toBe(1);
    expect(m.quarantine).toBe(0);
    expect(HORRORS.outbreak.productionMultiplier(m)).toBe(1);
  });

  it('stays out of the contract entirely in act one', () => {
    expect(run(fresh(), 600)).toMatchObject({ exposed: 0, sick: 0, turned: 0 });
  });

  it('goes round in act two like a flu: people fall sick and everyone gets better', () => {
    const m = run(fresh({ act: 2 }), 3_600);
    expect(m.recovered).toBeGreaterThan(0);
    expect(m.sick).toBeGreaterThan(0);
    expect(m.turned).toBe(0);
  });

  it('stops letting the sick recover after the discovery, and turns them once act four comes', () => {
    const three = run(fresh({ act: 3, sick: 0.2 }), 600);
    expect(three.recovered).toBe(0);
    expect(three.turned).toBe(0);
    const four = run(fresh({ act: 4, sick: 0.2 }), 600);
    expect(four.turned).toBeGreaterThan(0);
  });

  it('spreads more slowly the more of the workforce is in quarantine', () => {
    const open = run(fresh({ act: 3, exposed: 0.05 }), 900);
    const closed = run(fresh({ act: 3, exposed: 0.05, quarantine: MAX_QUARANTINE }), 900);
    expect(closed.exposed + closed.sick).toBeLessThan(open.exposed + open.sick);
  });

  it('costs output for everyone off shift: the sick, the turned and the quarantined', () => {
    const base = fresh();
    expect(offShift(fresh({ sick: 0.2 }))).toBeGreaterThan(offShift(base));
    expect(offShift(fresh({ quarantine: 5 }))).toBeGreaterThan(offShift(base));
    expect(horrorProductionMultiplier(fresh({ sick: 0.2, turned: 0.1 }) as MissionState)).toBeLessThan(1);
    expect(horrorProductionMultiplier(fresh({ sick: 1 }) as MissionState)).toBeGreaterThan(0);
  });

  it('has the turned push back on held ground', () => {
    expect(horrorPressure(fresh() as MissionState)).toBe(1);
    expect(horrorPressure(fresh({ turned: 0.3 }) as MissionState)).toBeGreaterThan(1);
  });

  it('has the turned sabotage equipment through the scenario, and say so in the log', () => {
    let lost = 0;
    const hooks: HorrorHooks = { loseEquipment: (m) => (lost++, { m, name: 'AUGER RIG' }) };
    const m = run(fresh({ act: 4, turned: 0.5 }), 600, hooks);
    expect(lost).toBeGreaterThan(0);
    expect(m.log.some((e) => e.text.includes('AUGER RIG'))).toBe(true);
  });

  it('moves the quarantine dial a tenth at a time, between none and its limit', () => {
    expect(shiftQuarantine(fresh(), 1).quarantine).toBe(1);
    expect(shiftQuarantine(fresh(), -1).quarantine).toBe(0);
    expect(shiftQuarantine(fresh({ quarantine: MAX_QUARANTINE }), 1).quarantine).toBe(MAX_QUARANTINE);
  });

  it('is deterministic for a seed', () => {
    const a = run(fresh({ act: 4, sick: 0.3, turned: 0.2 }), 300, { loseEquipment: (m) => ({ m, name: 'X' }) });
    const b = run(fresh({ act: 4, sick: 0.3, turned: 0.2 }), 300, { loseEquipment: (m) => ({ m, name: 'X' }) });
    expect(a).toEqual(b);
  });

  it('turns named crew as the turned spread in act four, awake crew first', () => {
    const awake = { ...fresh().crew, [CREW[0]!.id]: { ...fresh().crew[CREW[0]!.id]!, status: 'awake' as const } };
    const m = run(fresh({ act: 4, turned: 0.35, crew: awake }), 1);
    expect(m.crewTurned).toBe(3);
    expect(m.crew[CREW[0]!.id]!.status).toBe('lost');
    expect(m.log.filter((e) => e.text.includes('TURNED')).length).toBeGreaterThanOrEqual(3);
  });

  it('keeps every act two tell mundane: no word of turning, the strain or Bioproducts before the discovery', () => {
    const tells = OUTBREAK_BEATS.filter((b) => b.act === 2).flatMap((b) => b.entries.map((e) => e.text)).join(' ');
    expect(tells.length).toBeGreaterThan(0);
    expect(tells).not.toMatch(/\bTURN|KA-11|PALLOR|BIOPRODUCTS/i);
  });

  it('offers the three endings, in its own words', () => {
    expect(Object.keys(HORRORS.outbreak.endings).sort()).toEqual(['broadcast', 'deliver', 'scuttle']);
    expect(HORRORS.outbreak.endings.deliver!.title).toMatch(/SAMPLES/);
  });
});
