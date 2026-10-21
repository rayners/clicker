import { describe, it, expect } from 'vitest';
import { createRun, ASYLUM_CONFIG, type RunOf } from '../../src/late-fees/state';
import { tickRun } from '../../src/late-fees/tick';
import { KILLERS, VENUES } from '../../src/late-fees/registry';
import { ASYLUM_STAFF, WARDS } from '../../src/late-fees-data/asylum';
import { ASYLUM_UPGRADES } from '../../src/late-fees-data/asylum-upgrades';
import {
  asylumSignals,
  buyAsylumUpgrade,
  buyDoor,
  buyWard,
  calmCapacity,
  doorCost,
  hireAsylumStaff,
  incomeRate,
  isAutoSedationActive,
  patients,
  rounds,
  sedationShare,
  shiftSedation,
  staffCost,
  toggleAutoSedation,
  wardCost,
} from '../../src/late-fees/asylum/economy';
import { placeholders } from '../../src/shared/lexicon';
import { newLateGame } from '../../src/late-fees/game';
import { chooseTape } from '../../src/late-fees/sequels';
import { reduce } from '../../src/late-fees/store';

type A = RunOf<'asylum', 'patient'>;
const fresh = (patch: Partial<A> = {}): A => ({ ...createRun(ASYLUM_CONFIG, 1), ...patch });
const run = <R extends A>(r: R, seconds: number): R => {
  let next = r;
  for (let t = 0; t < seconds; t++) next = tickRun(next, 1) as R;
  return next;
};
const open = WARDS[0]!;
const attendant = ASYLUM_STAFF[0]!;
const wards = (beds: number, patch: Partial<A> = {}) => fresh({ wards: { ...fresh().wards, [open.id]: beds }, ...patch });
const staffed = (n: number) => ({ ...fresh().staff, [attendant.id]: n });
const pharmacy = ASYLUM_UPGRADES.find((u) => u.effect.kind === 'autoSedation')!;

describe('Grayhaven State Hospital', () => {
  it('opens with empty beds, nobody on the wards, light sedation, a happy inspector and nobody loose', () => {
    const r = fresh();
    expect(r.venue).toBe('asylum');
    expect(patients(r)).toBe(0);
    expect(r.agitation).toBe(0);
    expect(r.rating).toBe(1);
    expect(r.loose).toBe(0);
    expect(sedationShare(r)).toBeLessThan(0.5);
  });

  it('walks the wards by hand: a round is billed to the state, and calms the wards a little', () => {
    const r = rounds(wards(4, { agitation: 0.5 }));
    expect(r.cash).toBeGreaterThan(0);
    expect(r.agitation).toBeLessThan(0.5);
  });

  it('fills beds, each dearer than the last, and every filled bed earns state funding', () => {
    const r = buyWard(fresh({ cash: 100 }), open.id);
    expect(r.wards[open.id]).toBe(1);
    expect(r.cash).toBe(100 - wardCost(open, 0));
    expect(wardCost(open, 1)).toBeGreaterThan(wardCost(open, 0));
    expect(incomeRate(r)).toBeGreaterThan(0);
  });

  it('hires ward staff, who each keep a number of patients calm', () => {
    const r = hireAsylumStaff(fresh({ cash: 100 }), attendant.id);
    expect(r.staff[attendant.id]).toBe(1);
    expect(calmCapacity(r)).toBe(attendant.calms);
    expect(staffCost(attendant, 1)).toBeGreaterThan(staffCost(attendant, 0));
  });

  it('moves the sedation dial a notch per tap', () => {
    const r = fresh();
    expect(sedationShare(shiftSedation(r, 1))).toBeCloseTo(sedationShare(r) + 0.1);
    expect(sedationShare(shiftSedation(shiftSedation(r, -1), -1))).toBeGreaterThanOrEqual(0);
  });

  it('lets agitation build on wards nobody is calming, and keeps fully staffed wards calm', () => {
    expect(run(wards(10), 60).agitation).toBeGreaterThan(0);
    expect(run(wards(10, { staff: staffed(10) }), 60).agitation).toBe(0);
  });

  it('calms the wards with sedation, but the inspector marks it down and the funding falls with her rating', () => {
    const light = run(wards(10), 300);
    const heavy = run(wards(10, { sedation: 10 }), 300);
    expect(heavy.agitation).toBeLessThan(light.agitation);
    expect(heavy.rating).toBeLessThan(light.rating);
    expect(incomeRate(heavy)).toBeLessThan(incomeRate(light));
  });

  it('has an incident when a ward boils over: a patient gets out, unless a security door holds', () => {
    const boiling = wards(10, { agitation: 0.999 });
    const escaped = run(boiling, 5);
    expect(escaped.loose).toBe(1);
    expect(escaped.escapes).toBe(1);
    const held = run({ ...boiling, doors: 1000 }, 5);
    expect(held.loose).toBe(0);
    expect(doorCost(fresh({ doors: 1 }))).toBeGreaterThan(doorCost(fresh()));
    expect(buyDoor(fresh({ cash: 1e6 })).doors).toBe(1);
  });

  it('finds escapees slowly, and far more slowly on Candy Corn Day, when the whole town is in costume', () => {
    const ordinary = run(fresh({ loose: 5 }), 600);
    const candyCorn = run(fresh({ loose: 5, act: 3 }), 600);
    expect(ordinary.loose).toBeLessThan(5);
    expect(candyCorn.loose).toBeGreaterThan(ordinary.loose);
  });

  it('lets the pharmacy set the dial, just enough to keep the wards calm, and be overruled', () => {
    const r = wards(10, { upgrades: [pharmacy.id], staff: staffed(3) });
    expect(isAutoSedationActive(r)).toBe(true);
    expect(sedationShare(r)).toBeGreaterThan(0);
    expect(sedationShare({ ...r, staff: staffed(10) })).toBe(0);
    const manual = toggleAutoSedation(r);
    expect(isAutoSedationActive(manual)).toBe(false);
    expect(toggleAutoSedation(fresh())).toEqual(fresh());
  });

  it('sells requisitions once unlocked', () => {
    const first = ASYLUM_UPGRADES[0]!;
    const r = buyAsylumUpgrade(fresh({ cash: 1e6, lifetimeCash: 1e6 }), first.id);
    expect(r.upgrades).toContain(first.id);
    expect(buyAsylumUpgrade(fresh({ cash: 1e6 }), first.id).upgrades).toEqual([]);
  });

  it('rises with funding, opens deep access once the old buildings have beds, and it is always night on the wards', () => {
    expect(asylumSignals(fresh({ lifetimeCash: 1e7 })).progress).toBeGreaterThan(asylumSignals(fresh()).progress);
    const deep = WARDS.find((w) => w.deep)!;
    expect(asylumSignals(fresh({ wards: { ...fresh().wards, [deep.id]: 1 } })).deep).toBe(true);
    expect(asylumSignals(wards(1)).night).toBe(true);
  });

  it('has a phrase for everything every killer says there', () => {
    for (const k of Object.values(KILLERS)) {
      const texts = k.beats.flatMap((b) => b.entries.map((e) => e.text));
      expect(texts.flatMap(placeholders).filter((p) => p !== 'victim' && !(p in VENUES.asylum.lexicon)), k.id).toEqual([]);
    }
  });
});

describe('Patient 10-30', () => {
  it('kills on the first night', () => {
    const later = run(wards(20), 400);
    expect(later.log.some((e) => e.kind === 'kill')).toBe(true);
  });

  it('walks by day as well as by night: his pressure does not wait for the dark', () => {
    const day = { progress: 0, deep: false, night: false };
    const night = { ...day, night: true };
    const p = KILLERS.patient;
    expect(p.pressure(fresh(), day)).toBe(p.pressure(fresh(), night));
    expect(p.pressure(fresh({ act: 4 }), day)).toBeGreaterThan(p.pressure(fresh(), day));
  });

  it('never runs, never stops: he keeps coming even where nobody is asleep', () => {
    const r = fresh({ wards: { ...fresh().wards, [open.id]: 20 } });
    const day = { progress: 0, deep: false, night: false };
    let next = r;
    for (let t = 0; t < 600; t++) next = KILLERS.patient.tick(next, 1, { claim: VENUES.asylum.claim, lexicon: VENUES.asylum.lexicon }, day) as A;
    expect(next.bodyCount).toBeGreaterThan(0);
  });
});

describe('the Candy Corn Day tape in the game', () => {
  it('is on the shelf, and takes orders: rounds, beds, staff, the dial, doors, the pharmacy and requisitions', () => {
    let g = chooseTape(newLateGame(1, 0), 'asylum', 2);
    expect(g.run.venue).toBe('asylum');
    expect(g.run.killer).toBe('patient');
    expect(g.run.config.title).toBe('CANDY CORN DAY');
    g = { ...g, run: { ...g.run, cash: 1e9, lifetimeCash: 1e9 } };
    const a = () => g.run as A;
    g = reduce(g, { type: 'rounds' });
    g = reduce(g, { type: 'buyWard', id: open.id });
    expect(a().wards[open.id]).toBe(1);
    g = reduce(g, { type: 'hireAsylumStaff', id: attendant.id });
    expect(a().staff[attendant.id]).toBe(1);
    const dose = a().sedation;
    g = reduce(g, { type: 'shiftSedation', step: 1 });
    expect(a().sedation).toBe(dose + 1);
    g = reduce(g, { type: 'buyDoor' });
    expect(a().doors).toBe(1);
    g = reduce(g, { type: 'buyUpgrade', id: pharmacy.id });
    expect(a().upgrades).toContain(pharmacy.id);
    g = reduce(g, { type: 'toggleSedation' });
    expect(a().dialOff).toBe(true);
  });
});
