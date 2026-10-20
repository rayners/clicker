import { describe, it, expect } from 'vitest';
import { createMission, SECURITY_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { SCENARIOS } from '../../src/mission/registry';
import { FABRICATORS, SECTIONS, TROOPERS } from '../../src/data/security/systems';
import { SECURITY_UPGRADES } from '../../src/data/security/upgrades';
import {
  ammoDemand,
  ammoSupply,
  assaultForce,
  buyFabricator,
  buySecurityUpgrade,
  buySentry,
  buyTrooper,
  fireSupport,
  force,
  garrisons,
  incomeRate,
  isTacticalNetActive,
  progress,
  sentryCost,
  shiftSplit,
  toggleTacticalNet,
  trooperCost,
} from '../../src/mission/security/economy';
import { frontier, held, isSecured } from '../../src/shared/ground';

type S = MissionOf<'security', 'organism'>;
const fresh = (patch: Partial<S> = {}): S => ({ ...createMission(SECURITY_MISSION_CONFIG, 1), ...patch });
const run = <M extends S>(m: M, seconds: number): M => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1) as M;
  return next;
};
const press = (m: S, times: number) => {
  let next = m;
  for (let i = 0; i < times; i++) next = fireSupport(next);
  return next;
};
/** The first n sections secured and nobody holding them. */
const securedTo = (n: number, patch: Partial<S> = {}) =>
  fresh({ ground: SECTIONS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n })), deepest: n, ...patch });
const rifles = TROOPERS[0]!;
const net = SECURITY_UPGRADES.find((u) => u.effect.kind === 'tacticalNet')!;

describe('the colony at the start', () => {
  it('is every sector lost, nobody on the ground, the frontier at the landing pad', () => {
    const m = fresh();
    expect(m.ground).toHaveLength(SECTIONS.length);
    expect(held(m.ground)).toBe(0);
    expect(frontier(m.ground)).toBe(0);
    expect(force(m)).toBe(0);
    expect(incomeRate(m)).toBe(0);
  });
});

describe('taking the colony back', () => {
  it('lets WARDEN call in fire support to take the landing pad by hand, which then pays a retainer', () => {
    const m = press(fresh(), 200);
    expect(isSecured(m.ground[0]!)).toBe(true);
    expect(incomeRate(m)).toBeGreaterThan(0);
    expect(run(m, 10).credits).toBeGreaterThan(m.credits);
  });

  it('pays a recovery bounty, and says so, the first time each sector is secured', () => {
    const m = press(fresh(), 200);
    expect(m.credits).toBeGreaterThan(0);
    expect(m.deepest).toBe(1);
    expect(m.log.some((e) => /SECURED/.test(e.text) && e.text.includes(SECTIONS[0]!.name))).toBe(true);
  });

  it('sells troopers for credits, each dearer than the last, and they add to the force', () => {
    const m = fresh({ credits: 1_000 });
    const one = buyTrooper(m, rifles.id);
    expect(one.credits).toBe(1_000 - trooperCost(rifles, 0));
    expect(trooperCost(rifles, 1)).toBeGreaterThan(trooperCost(rifles, 0));
    expect(force(one)).toBeGreaterThan(0);
    expect(buyTrooper(fresh(), rifles.id).troopers[rifles.id]).toBe(0);
  });

  it('sends the assault share of the force at the frontier, which falls without anyone pressing a button', () => {
    const m = fresh({ troopers: { ...fresh().troopers, [rifles.id]: 20 }, fabricators: { ...fresh().fabricators, [FABRICATORS[0]!.id]: 50 } });
    expect(assaultForce(m)).toBeGreaterThan(0);
    expect(held(run(m, 120).ground)).toBeGreaterThan(0);
  });
});

describe('every body holding ground is a body not taking more', () => {
  const army = (patch: Partial<S> = {}) =>
    securedTo(3, {
      troopers: { ...fresh().troopers, [rifles.id]: 200 },
      fabricators: { ...fresh().fabricators, [FABRICATORS[0]!.id]: 500 },
      ...patch,
    });

  it('splits the force between assault and holding in tenths', () => {
    const m = army({ assaultShare: 10 });
    const held = shiftSplit(m, -1);
    expect(held.assaultShare).toBe(9);
    expect(assaultForce(held)).toBeLessThan(assaultForce(m));
    expect(shiftSplit(fresh({ assaultShare: 0 }), -1).assaultShare).toBe(0);
    expect(shiftSplit(fresh({ assaultShare: 10 }), 1).assaultShare).toBe(10);
  });

  it('stations the holding share on secured sectors, nearest the landing pad first', () => {
    const g = garrisons(army({ assaultShare: 5 }));
    expect(g[0]).toBeGreaterThan(0);
    expect(g[3]).toBe(0);
  });

  it('lets unheld sectors slip back to the colony, and logs the loss', () => {
    const later = run(army({ assaultShare: 10, troopers: fresh().troopers }), 3_000);
    expect(held(later.ground)).toBeLessThan(3);
    expect(later.log.some((e) => /LOST/.test(e.text))).toBe(true);
  });

  it('keeps sectors held while the holding share covers them', () => {
    expect(held(run(army({ assaultShare: 0 }), 600).ground)).toBeGreaterThanOrEqual(3);
  });
});

describe('ammunition', () => {
  const firing = (fabs: number) =>
    fresh({ assaultShare: 10, troopers: { ...fresh().troopers, [rifles.id]: 100 }, fabricators: { ...fresh().fabricators, [FABRICATORS[0]!.id]: fabs } });

  it('is made by fabricators and burned by the assault', () => {
    expect(ammoSupply(firing(10))).toBeGreaterThan(ammoSupply(firing(1)));
    expect(ammoDemand(firing(10))).toBeGreaterThan(0);
    const m = fresh({ credits: 1_000 });
    expect(buyFabricator(m, FABRICATORS[0]!.id).fabricators[FABRICATORS[0]!.id]).toBe(1);
  });

  it('slows the assault when supply falls short of what it burns', () => {
    expect(assaultForce(firing(0))).toBeLessThan(assaultForce(firing(10_000)));
    expect(assaultForce(firing(0))).toBeGreaterThan(0);
  });
});

describe('sentry guns', () => {
  const posted = (sentries: number) =>
    securedTo(3, { sentries, assaultShare: 10, fabricators: { ...fresh().fabricators, [FABRICATORS[0]!.id]: 1_000 } });

  it('hold secured sectors without any troopers on the line, drawing ammunition to do it', () => {
    expect(garrisons(posted(0))[0]).toBe(0);
    expect(garrisons(posted(1))[0]).toBeGreaterThan(0);
    expect(ammoDemand(posted(1))).toBeGreaterThan(ammoDemand(posted(0)));
  });

  it('fall silent without ammunition', () => {
    const dry = securedTo(3, { sentries: 1, assaultShare: 10 });
    expect(garrisons(dry)[0]).toBe(0);
  });

  it('get dearer with each one installed', () => {
    const m = fresh({ credits: 1e9 });
    expect(buySentry(m).sentries).toBe(1);
    expect(sentryCost(fresh({ sentries: 1 }))).toBeGreaterThan(sentryCost(fresh()));
  });
});

describe("WARDEN's tactical net", () => {
  const installed = (patch: Partial<S> = {}) =>
    securedTo(2, {
      upgrades: [net.id],
      assaultShare: 10,
      troopers: { ...fresh().troopers, [rifles.id]: 500 },
      fabricators: { ...fresh().fabricators, [FABRICATORS[0]!.id]: 2_000 },
      ...patch,
    });

  it('holds exactly what is needed and sends everything else at the frontier', () => {
    const m = installed();
    expect(isTacticalNetActive(m)).toBe(true);
    const g = garrisons(m);
    expect(g[0]).toBeCloseTo(SECTIONS[0]!.threat);
    expect(g[1]).toBeCloseTo(SECTIONS[1]!.threat);
    expect(assaultForce(m)).toBeCloseTo(force(m) - SECTIONS[0]!.threat - SECTIONS[1]!.threat, 0);
    // Sentries take their share of the line, freeing troopers for the assault.
    expect(assaultForce(installed({ sentries: 1 }))).toBeGreaterThan(assaultForce(m));
  });

  it('can be overruled, and handed control again', () => {
    const off = toggleTacticalNet(installed());
    expect(isTacticalNetActive(off)).toBe(false);
    expect(isTacticalNetActive(toggleTacticalNet(off))).toBe(true);
    expect(toggleTacticalNet(fresh())).toEqual(fresh());
  });

  it('is installed as a requisition once unlocked and paid for', () => {
    const m = fresh({ credits: 1e12, recovered: 1e12 });
    expect(buySecurityUpgrade(m, net.id).upgrades).toContain(net.id);
  });
});

describe('what the story sees', () => {
  it('rises with colony property recovered', () => {
    expect(progress(fresh({ recovered: 1e7 }))).toBeGreaterThan(progress(fresh({ recovered: 1e4 })));
  });

  it('opens deep access once the sub-levels are reached', () => {
    const sub = SECTIONS.findIndex((s) => s.deep);
    expect(sub).toBeGreaterThan(0);
    expect(SCENARIOS.security.signals(securedTo(sub)).deepAccess).toBe(false);
    expect(SCENARIOS.security.signals(securedTo(sub + 1)).deepAccess).toBe(true);
  });

  it('names who is on the ground at the terminus', () => {
    const stakes = SCENARIOS.security.stakes?.(securedTo(4, { troopers: { ...fresh().troopers, [rifles.id]: 12 } })) ?? '';
    expect(stakes).toMatch(/12 TROOPERS/);
    expect(stakes).toMatch(/4 OF/);
  });
});

describe('the horror reaches held ground', () => {
  it('makes unguarded sectors slip faster once something is loose in the colony', () => {
    const calm = run(securedTo(3), 300);
    const loose = run(securedTo(3, { act: 4, contacts: 3 }), 300);
    expect(loose.ground[0]!.control).toBeLessThan(calm.ground[0]!.control);
  });
});
