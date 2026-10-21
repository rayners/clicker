import { describe, it, expect } from 'vitest';
import { createRun, INSURER_CONFIG, type RunOf } from '../../src/late-fees/state';
import { tickRun } from '../../src/late-fees/tick';
import { KILLERS, VENUES } from '../../src/late-fees/registry';
import { AGENTS, POLICIES, SURVIVORS } from '../../src/late-fees-data/insurer';
import { INSURER_UPGRADES } from '../../src/late-fees-data/insurer-upgrades';
import {
  agentCost,
  buyInsurerUpgrade,
  buyPolicy,
  hireAgent,
  incomeRate,
  isActuaryActive,
  omenRate,
  policyCost,
  prevention,
  sellPolicy,
  shiftAppetite,
  toggleActuary,
  DUE_SECONDS,
} from '../../src/late-fees/insurer/economy';
import { placeholders } from '../../src/shared/lexicon';

type I = RunOf<'insurer', 'design'>;
const fresh = (patch: Partial<I> = {}): I => ({ ...createRun(INSURER_CONFIG, 1), ...patch });
const run = <R extends I>(r: R, seconds: number): R => {
  let next = r;
  for (let t = 0; t < seconds; t++) next = tickRun(next, 1) as R;
  return next;
};
const term = POLICIES[0]!;
const inspectors = AGENTS[0]!;
const book = (n: number, patch: Partial<I> = {}) => fresh({ policies: { ...fresh().policies, [term.id]: n }, ...patch });
const guarded = (n: number) => ({ ...fresh().agents, [inspectors.id]: n });
const mainframe = INSURER_UPGRADES.find((u) => u.effect.kind === 'actuary')!;

describe('Providence Mutual, the morning after', () => {
  it('holds a list of every survivor of Flight 213, in the order they should have died', () => {
    const r = fresh();
    expect(r.list).toEqual(SURVIVORS);
    expect(r.list.length).toBeGreaterThanOrEqual(30);
    expect(r.omens).toBe(0);
    expect(incomeRate(r)).toBe(0);
  });

  it('sells policies over the counter by hand for commission', () => {
    expect(sellPolicy(sellPolicy(fresh())).cash).toBeGreaterThan(0);
  });

  it('writes policies for premium income, each dearer than the last', () => {
    const r = buyPolicy(fresh({ cash: 1_000 }), term.id);
    expect(r.cash).toBe(1_000 - policyCost(term, 0));
    expect(policyCost(term, 1)).toBeGreaterThan(policyCost(term, 0));
    expect(incomeRate(r)).toBeGreaterThan(0);
  });

  it('hires prevention staff, who break the chains of omens', () => {
    const r = hireAgent(fresh({ cash: 1_000 }), inspectors.id);
    expect(r.agents[inspectors.id]).toBe(1);
    expect(agentCost(inspectors, 1)).toBeGreaterThan(agentCost(inspectors, 0));
    expect(prevention(r)).toBeGreaterThan(0);
  });
});

describe("Death's design", () => {
  it('works faster the bigger the business, and faster still the more risk is underwritten', () => {
    expect(omenRate(book(40))).toBeGreaterThan(omenRate(book(5)));
    expect(omenRate(shiftAppetite(book(20), 1))).toBeGreaterThan(omenRate(book(20)));
    expect(incomeRate(shiftAppetite(book(20), 1))).toBeGreaterThan(incomeRate(book(20)));
  });

  it('kills the next name on the list in an accident when nobody breaks the chain, and you pay out', () => {
    const r = book(60, { cash: 1e6 });
    const later = run(r, 600);
    expect(later.bodyCount).toBeGreaterThan(0);
    expect(later.list[0]).not.toBe(SURVIVORS[0]);
    expect(later.list).not.toContain(SURVIVORS[0]);
    expect(later.payouts).toBeGreaterThan(0);
    expect(later.log.some((e) => e.kind === 'kill' && e.text.includes(SURVIVORS[0]!))).toBe(true);
  });

  it('skips a name when prevention holds the omens back until they are due, and comes back angrier', () => {
    const r = book(5, { agents: guarded(200) });
    expect(prevention(r)).toBeGreaterThan(omenRate(r));
    const later = run(r, DUE_SECONDS + 5);
    expect(later.bodyCount).toBe(0);
    expect(later.cheats).toBe(1);
    expect(later.list.at(-1)).toBe(SURVIVORS[0]);
    expect(later.log.some((e) => /SKIP/.test(e.text))).toBe(true);
    expect(omenRate(later)).toBeGreaterThan(omenRate(r));
  });
});

describe('the actuarial mainframe', () => {
  it('sets the risk appetite as high as prevention can keep up with, and can be overruled', () => {
    const r = book(20, { upgrades: [mainframe.id], agents: guarded(60), appetite: 0 });
    expect(isActuaryActive(r)).toBe(true);
    expect(omenRate(r)).toBeLessThanOrEqual(prevention(r));
    expect(isActuaryActive(toggleActuary(r))).toBe(false);
    expect(buyInsurerUpgrade(fresh({ cash: 1e12, lifetimeCash: 1e12 }), mainframe.id).upgrades).toContain(mainframe.id);
  });
});

describe('what the story sees', () => {
  it('rises with premiums, opens deep access with aviation liability, and Death never sleeps', () => {
    const v = VENUES.insurer;
    expect(v.signals(fresh({ lifetimeCash: 1e7 })).progress).toBeGreaterThan(v.signals(fresh({ lifetimeCash: 1e3 })).progress);
    const deep = POLICIES.findIndex((p) => p.deep);
    expect(v.signals(fresh()).deep).toBe(false);
    expect(v.signals(fresh({ policies: { ...fresh().policies, [POLICIES[deep]!.id]: 1 } })).deep).toBe(true);
    expect(v.signals(book(1)).night).toBe(true);
  });

  it('names who is left on the list at the credits', () => {
    expect(VENUES.insurer.stakes(book(3, { list: SURVIVORS.slice(0, 12) }))).toMatch(/12 NAMES/);
  });
});

describe("Death's design as a killer", () => {
  const texts = () => [...KILLERS.design.beats.flatMap((b) => b.entries.map((e) => e.text)), ...Object.values(KILLERS.design.endings).map((e) => e.text)];

  it('gives the insurer a phrase for every placeholder it uses', () => {
    expect(texts().flatMap(placeholders).filter((k) => k !== 'victim' && k !== 'nextPart' && !(k in VENUES.insurer.lexicon))).toEqual([]);
  });

  it('could come for the camp or the clinic too (crossovers)', () => {
    const beats = KILLERS.design.beats.flatMap((b) => b.entries.map((e) => e.text)).flatMap(placeholders).filter((k) => k !== 'victim');
    expect(beats.filter((k) => !(k in VENUES.camp.lexicon))).toEqual([]);
    expect(beats.filter((k) => !(k in VENUES.clinic.lexicon))).toEqual([]);
  });

  it('opens with the premonition', () => {
    expect(run(book(1), 30).log.some((e) => e.kind === 'kill' && /PREMONITION|FLIGHT 213/.test(e.text))).toBe(true);
  });
});
