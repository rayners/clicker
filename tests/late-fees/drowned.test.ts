import { describe, it, expect } from 'vitest';
import { composeRun, createRun, CAMP_CONFIG, type Run, type RunOf } from '../../src/late-fees/state';
import { tickRun } from '../../src/late-fees/tick';
import { KILLERS, VENUES } from '../../src/late-fees/registry';
import { COUNSELORS } from '../../src/late-fees-data/camp';
import { NIGHT_FROM } from '../../src/late-fees/camp/economy';
import { CONFRONTATION_AFTER, CREDITS_AFTER } from '../../src/late-fees/story';
import { placeholders } from '../../src/shared/lexicon';
import type { VenueDef } from '../../src/late-fees/kinds';

type C = RunOf<'camp', 'drowned'>;
const fresh = (patch: Partial<C> = {}): C => ({ ...createRun(CAMP_CONFIG, 1), ...patch });
const run = <R extends Run>(r: R, seconds: number): R => {
  let next = r;
  for (let t = 0; t < seconds; t++) next = tickRun(next, 1) as R;
  return next;
};
const staffed = (patch: Partial<C> = {}) => fresh({ counselors: { ...fresh().counselors, [COUNSELORS[0]!.id]: 30 }, ...patch });

describe('the Drowned Boy', () => {
  it('kills someone on the first night, before anything else', () => {
    const night = run(fresh({ elapsed: NIGHT_FROM - 2 }), 5);
    expect(night.log.some((e) => e.kind === 'kill' && /FIRST NIGHT/.test(e.text))).toBe(true);
  });

  it('takes counselors one by one at night, naming each, and never by day', () => {
    const day = run(staffed({ elapsed: 0 }), 300);
    expect(day.bodyCount).toBe(0);
    const night = run(staffed({ elapsed: NIGHT_FROM }), 170);
    expect(night.bodyCount).toBeGreaterThan(0);
    expect(night.counselors[COUNSELORS[0]!.id]).toBeLessThan(30);
    expect(night.log.some((e) => e.kind === 'kill' && /COUNSELOR [A-Z]+/.test(e.text))).toBe(true);
  });

  it('comes back stronger in a sequel', () => {
    const signals = { progress: 0, deep: false, night: true };
    const sequel = fresh({ config: { ...CAMP_CONFIG, part: 2, pressureBonus: 0.15 } });
    expect(KILLERS.drowned.pressure(sequel, signals)).toBeGreaterThan(KILLERS.drowned.pressure(fresh(), signals));
  });

  it('knows a venue only through signals, words and the claim hook: it runs on a venue it has never heard of', () => {
    const words = [...KILLERS.drowned.beats.flatMap((b) => b.entries.map((e) => e.text)), ...Object.values(KILLERS.drowned.endings).map((e) => e.text)];
    const stub: VenueDef = {
      ...VENUES.camp,
      id: 'stub',
      signals: () => ({ progress: 0, deep: false, night: true }),
      tick: (r) => r,
      lexicon: Object.fromEntries(words.flatMap(placeholders).map((k) => [k, `<${k}>`])),
      beats: [],
    };
    const r = composeRun(CAMP_CONFIG, 1, stub, KILLERS.drowned);
    expect(() => KILLERS.drowned.tick(r, 1, { claim: stub.claim, lexicon: stub.lexicon }, stub.signals(r))).not.toThrow();
  });

  it('gives the camp a phrase for every placeholder he uses', () => {
    const texts = [...KILLERS.drowned.beats.flatMap((b) => b.entries.map((e) => e.text)), ...Object.values(KILLERS.drowned.endings).map((e) => e.text)];
    const missing = texts.flatMap(placeholders).filter((k) => k !== 'victim' && k !== 'nextPart' && !(k in VENUES.camp.lexicon));
    expect(missing).toEqual([]);
  });
});

describe('the film', () => {
  it('turns to the body count once the camp is making real money', () => {
    expect(run(fresh({ lifetimeCash: 3e6 }), 60).act).toBe(2);
  });

  it('brings in the final girl once the far side of the lake is open', () => {
    const deep = fresh({ act: 2, lifetimeCash: 1e8, deepest: 11 });
    const r = run(deep, 2);
    expect(r.act).toBe(3);
    expect(r.flags).toContain('final-girl');
  });

  it('builds to the confrontation and then the credits on the clock', () => {
    const girl = fresh({ act: 3, beats: { 'act-2': 0, 'act-3': 0 }, lifetimeCash: 1e8, deepest: 11 });
    const confronted = run(girl, CONFRONTATION_AFTER + 5);
    expect(confronted.act).toBe(4);
    const credits = run(confronted, CREDITS_AFTER + 5);
    expect(credits.flags).toContain('terminus');
  });
});
