import { describe, it, expect } from 'vitest';
import { createRun, CLINIC_CONFIG, type RunOf } from '../../src/late-fees/state';
import { tickRun } from '../../src/late-fees/tick';
import { KILLERS, VENUES } from '../../src/late-fees/registry';
import { BEDS, STAFF } from '../../src/late-fees-data/clinic';
import { CLINIC_UPGRADES } from '../../src/late-fees-data/clinic-upgrades';
import {
  bedCost,
  buyBed,
  buyClinicUpgrade,
  buySuppressant,
  exposed,
  hireStaff,
  incomeRate,
  isAutoDialActive,
  patients,
  protectedCount,
  reading,
  remPatients,
  shiftRem,
  staffCost,
  suppressantCost,
  toggleAutoDial,
  watchCapacity,
  REM_NEED,
} from '../../src/late-fees/clinic/economy';
import { placeholders } from '../../src/shared/lexicon';

type K = RunOf<'clinic', 'burned'>;
const fresh = (patch: Partial<K> = {}): K => ({ ...createRun(CLINIC_CONFIG, 1), ...patch });
const run = <R extends K>(r: R, seconds: number): R => {
  let next = r;
  for (let t = 0; t < seconds; t++) next = tickRun(next, 1) as R;
  return next;
};
const cots = BEDS[0]!;
const orderlies = STAFF[0]!;
const ward = (beds: number, patch: Partial<K> = {}) => fresh({ beds: { ...fresh().beds, [cots.id]: beds }, ...patch });
const watched = (staff: number) => ({ ...fresh().staff, [orderlies.id]: staff });
const autoDial = CLINIC_UPGRADES.find((u) => u.effect.kind === 'autoDial')!;

describe('the Sycamore Street Sleep Clinic', () => {
  it('opens with empty beds, nobody watching, and the dial at the healthy share of deep sleep', () => {
    const c = fresh();
    expect(patients(c)).toBe(0);
    expect(watchCapacity(c)).toBe(0);
    expect(c.remShare / 10).toBeCloseTo(REM_NEED);
    expect(incomeRate(c)).toBe(0);
  });

  it('takes readings by hand for grant money', () => {
    const c = reading(reading(fresh()));
    expect(c.cash).toBeGreaterThan(0);
  });

  it('sells beds, each dearer than the last, and every bed is a patient who earns while asleep', () => {
    const c = buyBed(fresh({ cash: 1_000 }), cots.id);
    expect(c.cash).toBe(1_000 - bedCost(cots, 0));
    expect(bedCost(cots, 1)).toBeGreaterThan(bedCost(cots, 0));
    expect(patients(c)).toBe(1);
    expect(incomeRate(c)).toBeGreaterThan(0);
  });

  it('hires night staff, who watch a number of deep sleepers each', () => {
    const c = hireStaff(fresh({ cash: 1_000 }), orderlies.id);
    expect(c.staff[orderlies.id]).toBe(1);
    expect(staffCost(orderlies, 1)).toBeGreaterThan(staffCost(orderlies, 0));
    expect(watchCapacity(c)).toBeGreaterThan(0);
  });
});

describe('the deep-sleep dial', () => {
  it('moves a tenth of the patients into or out of deep sleep per tap', () => {
    const c = ward(20);
    expect(remPatients(shiftRem(c, 1))).toBeGreaterThan(remPatients(c));
    expect(shiftRem(fresh({ remShare: 10 }), 1).remShare).toBe(10);
    expect(shiftRem(fresh({ remShare: 0 }), -1).remShare).toBe(0);
  });

  it('pays more for deep sleep, but only for deep sleepers someone is watching', () => {
    const light = ward(20, { remShare: 0, debt: 0 });
    const deepWatched = ward(20, { remShare: 8, staff: watched(50) });
    const deepAlone = ward(20, { remShare: 8 });
    expect(incomeRate(deepWatched)).toBeGreaterThan(incomeRate(light));
    expect(incomeRate(deepAlone)).toBeLessThan(incomeRate(deepWatched));
  });

  it('leaves unwatched deep sleepers exposed, and the Burned Man takes them in their beds', () => {
    const c = ward(30, { remShare: 8 });
    expect(exposed(c)).toBeGreaterThan(0);
    const later = run(c, 300);
    expect(later.bodyCount).toBeGreaterThan(0);
    expect(later.log.some((e) => e.kind === 'kill')).toBe(true);
    expect(later.reputation).toBeLessThan(1);
  });

  it('keeps watched patients safe', () => {
    const c = ward(30, { remShare: 3, staff: watched(100) });
    expect(exposed(c)).toBe(0);
    const later = run(c, 30);
    expect(later.reputation).toBe(1);
  });

  it('builds sleep debt when deep sleep is denied, until patients nod off where nobody is watching', () => {
    const denied = run(ward(30, { remShare: 0, staff: watched(100) }), 900);
    expect(denied.debt).toBeGreaterThan(1);
    expect(exposed(denied)).toBeGreaterThan(0);
    const rested = run({ ...denied, remShare: 5 }, 900);
    expect(rested.debt).toBeLessThan(denied.debt);
  });
});

describe('suppressant and automated monitoring', () => {
  it('protects a rationed number of deep sleepers without staff, each allocation dearer', () => {
    const c = buySuppressant(ward(30, { remShare: 8, cash: 1e9 }));
    expect(c.suppressant).toBe(1);
    expect(protectedCount(c)).toBeGreaterThan(0);
    expect(exposed(c)).toBeLessThan(exposed(ward(30, { remShare: 8 })));
    expect(suppressantCost(c)).toBeGreaterThan(suppressantCost(fresh()) * 2);
  });

  it('lets automated monitoring set the dial as deep as the watch allows, and be overruled', () => {
    const c = ward(40, { upgrades: [autoDial.id], staff: watched(30), remShare: 0 });
    expect(isAutoDialActive(c)).toBe(true);
    expect(remPatients(c)).toBeGreaterThan(0);
    expect(exposed(c)).toBe(0);
    expect(isAutoDialActive(toggleAutoDial(c))).toBe(false);
    expect(buyClinicUpgrade(fresh({ cash: 1e12, lifetimeCash: 1e12 }), autoDial.id).upgrades).toContain(autoDial.id);
  });
});

describe('what the story sees', () => {
  it('rises with grant money, opens deep access once the basement ward has beds, and is always night inside', () => {
    const v = VENUES.clinic;
    expect(v.signals(fresh({ lifetimeCash: 1e7 })).progress).toBeGreaterThan(v.signals(fresh({ lifetimeCash: 1e3 })).progress);
    const deep = BEDS.findIndex((b) => b.deep);
    expect(v.signals(fresh()).deep).toBe(false);
    expect(v.signals(fresh({ beds: { ...fresh().beds, [BEDS[deep]!.id]: 1 } })).deep).toBe(true);
    expect(v.signals(ward(1)).night).toBe(true);
  });

  it('names who is left at the credits', () => {
    expect(VENUES.clinic.stakes(ward(12, { bodyCount: 5 }))).toMatch(/12 PATIENTS/);
  });
});

describe('the Burned Man', () => {
  it('gives the clinic a phrase for every placeholder he uses', () => {
    const texts = [...KILLERS.burned.beats.flatMap((b) => b.entries.map((e) => e.text)), ...Object.values(KILLERS.burned.endings).map((e) => e.text)];
    const missing = texts.flatMap(placeholders).filter((k) => k !== 'victim' && k !== 'nextPart' && !(k in VENUES.clinic.lexicon));
    expect(missing).toEqual([]);
  });

  it('can haunt the camp too: the camp has every phrase he needs (crossovers)', () => {
    const texts = KILLERS.burned.beats.flatMap((b) => b.entries.map((e) => e.text));
    const missing = texts.flatMap(placeholders).filter((k) => k !== 'victim' && !(k in VENUES.camp.lexicon));
    expect(missing).toEqual([]);
  });

  it('kills on the first night of the study', () => {
    const night = run(ward(5), 30);
    expect(night.log.some((e) => e.kind === 'kill' && /FIRST NIGHT/.test(e.text))).toBe(true);
  });
});
