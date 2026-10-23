import { describe, it, expect } from 'vitest';
import { createRun, CAMP_CONFIG, type RunOf } from '../../src/late-fees/state';
import { tickRun } from '../../src/late-fees/tick';
import { VENUES } from '../../src/late-fees/registry';
import { COUNSELORS, LIGHTS, ZONES } from '../../src/late-fees-data/camp';
import { CAMP_UPGRADES } from '../../src/late-fees-data/camp-upgrades';
import {
  buyCampUpgrade,
  buyCounselor,
  buyLight,
  buyTower,
  counselorCost,
  incomeRate,
  isHeadCounselorActive,
  isNight,
  lightDemand,
  lightSupply,
  prepForce,
  shiftSplit,
  staff,
  toggleHeadCounselor,
  watchNeeded,
  whistle,
  NIGHT_FROM,
  DAY_LENGTH,
} from '../../src/late-fees/camp/economy';
import { frontier, held, isSecured } from '../../src/engine/ground';

type C = RunOf<'camp', 'drowned'>;
const fresh = (patch: Partial<C> = {}): C => ({ ...createRun(CAMP_CONFIG, 1), ...patch });
const run = <R extends C>(r: R, seconds: number): R => {
  let next = r;
  for (let t = 0; t < seconds; t++) next = tickRun(next, 1) as R;
  return next;
};
const blow = (r: C, times: number) => {
  let next = r;
  for (let i = 0; i < times; i++) next = whistle(next);
  return next;
};
const openTo = (n: number, patch: Partial<C> = {}) =>
  fresh({ zones: ZONES.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n })), deepest: n, ...patch });
const juniors = COUNSELORS[0]!;
const lanterns = LIGHTS[0]!;
const head = CAMP_UPGRADES.find((u) => u.effect.kind === 'headCounselor')!;
const team = (n: number) => ({ ...fresh().counselors, [juniors.id]: n });
const lit = (n: number) => ({ ...fresh().lights, [lanterns.id]: n });

describe('Camp Blackwater at the gate', () => {
  it('starts with every zone closed, no staff, the frontier at the front gate, and it is daytime', () => {
    const c = fresh();
    expect(c.zones).toHaveLength(ZONES.length);
    expect(held(c.zones)).toBe(0);
    expect(frontier(c.zones)).toBe(0);
    expect(staff(c)).toBe(0);
    expect(incomeRate(c)).toBe(0);
    expect(isNight(c)).toBe(false);
  });
});

describe('opening the camp', () => {
  it('lets the director blow the whistle to open the front gate, which then takes enrolments', () => {
    const c = blow(fresh(), 200);
    expect(isSecured(c.zones[0]!)).toBe(true);
    expect(incomeRate(c)).toBeGreaterThan(0);
    expect(run(c, 10).cash).toBeGreaterThan(c.cash);
  });

  it('pays a booking rush, and says so, the first time each zone opens', () => {
    const c = blow(fresh(), 200);
    expect(c.cash).toBeGreaterThan(0);
    expect(c.deepest).toBe(1);
    expect(c.log.some((e) => e.text.includes(ZONES[0]!.name) && /OPEN/.test(e.text))).toBe(true);
  });

  it('hires counselors for cash, each dearer than the last', () => {
    const c = fresh({ cash: 1_000 });
    const one = buyCounselor(c, juniors.id);
    expect(one.cash).toBe(1_000 - counselorCost(juniors, 0));
    expect(counselorCost(juniors, 1)).toBeGreaterThan(counselorCost(juniors, 0));
    expect(staff(one)).toBeGreaterThan(0);
    expect(buyCounselor(fresh(), juniors.id).counselors[juniors.id]).toBe(0);
  });

  it('sends the prep share of the staff to open the next zone on their own', () => {
    const c = fresh({ counselors: team(20), lights: lit(50) });
    expect(prepForce(c)).toBeGreaterThan(0);
    expect(held(run(c, 120).zones)).toBeGreaterThan(0);
  });
});

describe('every counselor on watch is one not opening more of the camp', () => {
  it('splits staff between prep and watch in tenths', () => {
    const c = openTo(3, { counselors: team(200), lights: lit(500), prepShare: 10 });
    expect(shiftSplit(c, -1).prepShare).toBe(9);
    expect(prepForce(shiftSplit(c, -1))).toBeLessThan(prepForce(c));
  });

  it('needs more watching the more of the camp is open', () => {
    expect(watchNeeded(openTo(4))).toBeGreaterThan(watchNeeded(openTo(2)));
  });
});

describe('night', () => {
  it('falls on a cycle', () => {
    expect(isNight(fresh({ elapsed: NIGHT_FROM - 1 }))).toBe(false);
    expect(isNight(fresh({ elapsed: NIGHT_FROM + 1 }))).toBe(true);
    expect(isNight(fresh({ elapsed: DAY_LENGTH + 1 }))).toBe(false);
  });

  it('is when the lights matter: demand climbs after dark', () => {
    const day = openTo(3, { counselors: team(50), elapsed: 10 });
    const night = { ...day, elapsed: NIGHT_FROM + 5 };
    expect(lightDemand(night)).toBeGreaterThan(lightDemand(day));
    expect(lightSupply(fresh({ lights: lit(10) }))).toBeGreaterThan(lightSupply(fresh({ lights: lit(1) })));
    expect(buyLight(fresh({ cash: 1_000 }), lanterns.id).lights[lanterns.id]).toBe(1);
  });

  it('lets the dark take unwatched zones, and the campers in them, with every name in the log', () => {
    const open = openTo(4, { elapsed: NIGHT_FROM, prepShare: 10 });
    const later = run(open, 900);
    expect(held(later.zones)).toBeLessThan(4);
    expect(later.bodyCount).toBeGreaterThan(0);
    expect(later.log.some((e) => e.kind === 'kill')).toBe(true);
  });

  it('costs reputation for every zone lost, which slows enrolment, and reputation recovers in time', () => {
    const open = openTo(4, { elapsed: NIGHT_FROM, prepShare: 10 });
    const after = run(open, 900);
    expect(after.reputation).toBeLessThan(1);
    const healed = run({ ...after, reputation: 0.5, zones: openTo(0).zones }, 600);
    expect(healed.reputation).toBeGreaterThan(0.5);
  });

  it('keeps watched zones safe through the night', () => {
    const c = openTo(3, { counselors: team(400), lights: lit(400), prepShare: 0, elapsed: NIGHT_FROM });
    expect(held(run(c, 200).zones)).toBeGreaterThanOrEqual(3);
  });
});

describe('watchtowers and the head counselor', () => {
  it('lets watchtowers keep watch without staff, burning light to do it', () => {
    const c = openTo(3, { prepShare: 10, lights: lit(1_000), elapsed: NIGHT_FROM + 5 });
    const towered = buyTower({ ...c, cash: 1e9 });
    expect(towered.towers).toBe(1);
    expect(lightDemand(towered)).toBeGreaterThan(lightDemand(c));
  });

  it('lets the head counselor split the staff, and be overruled', () => {
    const c = openTo(2, { upgrades: [head.id], counselors: team(500), lights: lit(2_000), prepShare: 10 });
    expect(isHeadCounselorActive(c)).toBe(true);
    expect(prepForce(c)).toBeCloseTo(staff(c) - watchNeeded(c), 0);
    expect(isHeadCounselorActive(toggleHeadCounselor(c))).toBe(false);
    expect(buyCampUpgrade(fresh({ cash: 1e12, lifetimeCash: 1e12 }), head.id).upgrades).toContain(head.id);
  });
});

describe('what the story sees', () => {
  it('rises with takings, and opens the deep woods once the old campsite is reached', () => {
    const v = VENUES.camp;
    expect(v.signals(fresh({ lifetimeCash: 1e7 })).progress).toBeGreaterThan(v.signals(fresh({ lifetimeCash: 1e3 })).progress);
    const deep = ZONES.findIndex((z) => z.deep);
    expect(v.signals(openTo(deep)).deep).toBe(false);
    expect(v.signals(openTo(deep + 1)).deep).toBe(true);
    expect(v.signals(fresh({ elapsed: NIGHT_FROM + 1 })).night).toBe(true);
  });
});
