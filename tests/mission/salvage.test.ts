import { describe, it, expect } from 'vitest';
import { createMission, SALVAGE_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { SCENARIOS } from '../../src/mission/registry';
import { COMPARTMENTS, CUTTERS, SHORING } from '../../src/data/salvage/systems';
import { SALVAGE_UPGRADES } from '../../src/data/salvage/upgrades';
import {
  buyCutter,
  buySalvageUpgrade,
  buyShoring,
  cut,
  cutForce,
  cutterCost,
  effectiveNotch,
  garrisons,
  incomeRate,
  isGovernorActive,
  progress,
  safeLine,
  SEAL_SECONDS,
  shiftNotch,
  shoringCost,
  shoringHold,
  stripRate,
  toggleGovernor,
  salvageGain,
} from '../../src/mission/salvage/economy';
import { frontier, held, isSecured } from '../../src/shared/ground';

type S = MissionOf<'salvage', 'organism'>;
const fresh = (patch: Partial<S> = {}): S => ({ ...createMission(SALVAGE_MISSION_CONFIG, 1), ...patch });
const run = <M extends S>(m: M, seconds: number): M => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1) as M;
  return next;
};
const press = (m: S, times: number) => {
  let next = m;
  for (let i = 0; i < times; i++) next = cut(next);
  return next;
};
/** The first n compartments open and nothing bracing them. */
const openTo = (n: number, patch: Partial<S> = {}) =>
  fresh({ ground: COMPARTMENTS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n })), deepest: n, ...patch });
const welders = CUTTERS[0]!;
const frames = SHORING[0]!;
const crew = (count: number) => ({ ...fresh().cutters, [welders.id]: count });
const braces = (count: number) => ({ ...fresh().shoring, [frames.id]: count });
const governor = SALVAGE_UPGRADES.find((u) => u.effect.kind === 'governor')!;
const safer = SALVAGE_UPGRADES.find((u) => u.effect.kind === 'safeLine')!;

describe('the derelict at the start', () => {
  it('is every compartment shut, no cutters aboard, the frontier at the bow airlock', () => {
    const m = fresh();
    expect(m.ground).toHaveLength(COMPARTMENTS.length);
    expect(held(m.ground)).toBe(0);
    expect(frontier(m.ground)).toBe(0);
    expect(cutForce(m)).toBe(0);
    expect(incomeRate(m)).toBe(0);
    expect(m.notch).toBe(5);
    expect(m.stress).toBe(0);
  });
});

describe('cutting in', () => {
  it('lets WARDEN cut the bow airlock open by hand', () => {
    expect(isSecured(press(fresh(), 80).ground[0]!)).toBe(true);
  });

  it('pays salvage as the torch goes in, before the compartment is even open', () => {
    const m = press(fresh(), 10);
    expect(isSecured(m.ground[0]!)).toBe(false);
    expect(m.credits).toBeGreaterThan(0);
    expect(m.recovered).toBe(m.credits);
  });

  it('strips an open compartment for steady salvage, and says so when it opens', () => {
    const m = press(fresh(), 80);
    expect(stripRate(m)).toBeGreaterThan(0);
    expect(m.deepest).toBe(1);
    expect(m.log.some((e) => /OPENED/.test(e.text) && e.text.includes(COMPARTMENTS[0]!.name))).toBe(true);
    expect(run({ ...m, shoring: braces(10) }, 10).credits).toBeGreaterThan(m.credits);
  });

  it('pays for each compartment only once, however often it is cut back into', () => {
    const once = press(fresh(), 80);
    const shut = { ...once, ground: fresh().ground };
    expect(press(shut, 80).credits - shut.credits).toBeLessThan(once.credits / 10);
  });

  it('sells cutters for credits, each dearer than the last, and they cut without anyone pressing a button', () => {
    const m = fresh({ credits: 1_000 });
    const one = buyCutter(m, welders.id);
    expect(one.credits).toBe(1_000 - cutterCost(welders, 0));
    expect(cutterCost(welders, 1)).toBeGreaterThan(cutterCost(welders, 0));
    expect(cutForce(one)).toBeGreaterThan(0);
    expect(buyCutter(fresh(), welders.id).cutters[welders.id]).toBe(0);
    expect(held(run(fresh({ cutters: crew(20) }), 120).ground)).toBeGreaterThan(0);
  });
});

describe('shoring keeps the derelict open', () => {
  it('lets unbraced compartments buckle back shut, and logs it', () => {
    const later = run(openTo(3), 3_000);
    expect(held(later.ground)).toBeLessThan(3);
    expect(later.log.some((e) => /BUCKLED/.test(e.text))).toBe(true);
  });

  it('keeps compartments open while the shoring carries their load', () => {
    const m = openTo(3, { shoring: braces(200) });
    expect(shoringHold(m)).toBeGreaterThan(0);
    expect(held(run(m, 600).ground)).toBe(3);
  });

  it('braces from the airlock aft, so a short supply leaves the far compartments bare', () => {
    const g = garrisons(openTo(4, { shoring: braces(10) }));
    expect(g[0]).toBeGreaterThan(0);
    expect(g[3]).toBe(0);
  });

  it('gets dearer faster than the cutters do: shoring is the brake', () => {
    expect(shoringCost(frames, 20) / shoringCost(frames, 0)).toBeGreaterThan(cutterCost(welders, 20) / cutterCost(welders, 0));
    expect(buyShoring(fresh({ credits: 1e6 }), frames.id).shoring[frames.id]).toBe(1);
  });
});

describe('the torch dial', () => {
  it('runs from notch 1 to 10', () => {
    expect(shiftNotch(fresh({ notch: 10 }), 1).notch).toBe(10);
    expect(shiftNotch(fresh({ notch: 1 }), -1).notch).toBe(1);
    expect(shiftNotch(fresh(), 1).notch).toBe(6);
  });

  it('cuts faster, and pays faster, on a hotter notch', () => {
    const cool = run(fresh({ cutters: crew(5), notch: 3 }), 20);
    const hot = run(fresh({ cutters: crew(5), notch: 8 }), 20);
    expect(hot.ground[0]!.control).toBeGreaterThan(cool.ground[0]!.control);
    expect(hot.credits).toBeGreaterThan(cool.credits);
  });

  it('stresses the hull above the safe line, and lets the stress bleed off at or below it', () => {
    const hot = run(fresh({ cutters: crew(1), notch: 8 }), 5);
    expect(hot.stress).toBeGreaterThan(0);
    expect(run({ ...hot, notch: safeLine(hot) }, 5).stress).toBeLessThan(hot.stress);
    expect(run(fresh({ cutters: crew(1) }), 5).stress).toBe(0);
  });

  it('breaches at full stress: the frontier vents, its progress is lost and it is sealed for a while', () => {
    const m = fresh({ cutters: crew(1), notch: 10, stress: 0.99, ground: fresh().ground.map((s, i) => (i === 0 ? { ...s, control: 0.5 } : s)) });
    const after = run(m, 1);
    expect(after.ground[0]!.control).toBe(0);
    expect(after.stress).toBe(0);
    expect(after.sealedFor).toBeGreaterThan(0);
    expect(after.breaches).toBe(1);
    expect(after.log.some((e) => /BREACH/.test(e.text))).toBe(true);
    expect(run(after, 10).ground[0]!.control).toBe(0);
    expect(run({ ...after, notch: 5 }, SEAL_SECONDS + 30).ground[0]!.control).toBeGreaterThan(0);
  });
});

describe('requisitions', () => {
  it('sells upgrades once unlocked and affordable', () => {
    const rich = fresh({ credits: 1e12, recovered: 1e12 });
    expect(buySalvageUpgrade(rich, governor.id).upgrades).toContain(governor.id);
    expect(buySalvageUpgrade(fresh(), governor.id).upgrades).not.toContain(governor.id);
  });

  it('raises the safe line with better hull monitoring', () => {
    const m = fresh({ upgrades: [safer.id] });
    expect(safeLine(m)).toBe(safeLine(fresh()) + safer.effect.value);
  });

  it('installs a hull governor that runs the torch hot without ever breaching, until WARDEN is overruled', () => {
    const m = fresh({ cutters: crew(1), upgrades: [governor.id], notch: 3 });
    expect(isGovernorActive(m)).toBe(true);
    expect(effectiveNotch(m)).toBeGreaterThan(safeLine(m));
    const later = run(m, 600);
    expect(later.breaches).toBe(0);
    const overruled = toggleGovernor(m);
    expect(isGovernorActive(overruled)).toBe(false);
    expect(effectiveNotch(overruled)).toBe(3);
    expect(toggleGovernor(fresh()).governorOff).toBe(false);
  });
});

describe('a salvage contract as a mission', () => {
  it('climbs the shared story scale as salvage is recovered', () => {
    expect(progress(fresh({ recovered: 1e6 }))).toBeGreaterThan(progress(fresh({ recovered: 1e3 })));
  });

  it('gives the story deep access once the sealed cargo hold is open', () => {
    const hold = COMPARTMENTS.findIndex((c) => c.deep);
    expect(SCENARIOS.salvage.signals(openTo(hold)).deepAccess).toBe(false);
    expect(SCENARIOS.salvage.signals(openTo(hold + 1)).deepAccess).toBe(true);
  });

  it('boots, ticks headless for an hour and stays serializable', () => {
    const m = run(fresh({ cutters: crew(10), shoring: braces(20) }), 3_600);
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
    expect(m.lifetimeCredits).toBeGreaterThan(0);
  });
});

describe('what one more cutter or shoring adds on a salvage contract', () => {
  const open = (n: number) => COMPARTMENTS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));

  it('says a cutter adds salvage pay at the frontier', () => {
    const m = fresh({ cutters: { ...fresh().cutters, [welders.id]: 2 } });
    expect(salvageGain(m, { cutter: welders.id }).income).toBeGreaterThan(0);
  });

  it('says shoring adds hold only while open compartments need bracing', () => {
    const needy = fresh({ ground: open(3), deepest: 3 });
    expect(salvageGain(needy, { shoring: frames.id }).hold).toBeGreaterThan(0);
    const braced = fresh({ ground: open(1), deepest: 1, shoring: { ...fresh().shoring, [frames.id]: 500 } });
    expect(salvageGain(braced, { shoring: frames.id }).hold).toBe(0);
  });
});
