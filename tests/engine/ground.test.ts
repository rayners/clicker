import { describe, it, expect } from 'vitest';
import {
  assault,
  createGround,
  frontier,
  held,
  isSecured,
  setGarrison,
  tickGround,
  upkeep,
  ASSAULT_SECONDS,
  LOST_BELOW,
  type SectionDef,
} from '../../src/engine/ground';

const DEFS: SectionDef[] = [
  { id: 'pad', name: 'LANDING PAD', threat: 10, reclaim: 0.01 },
  { id: 'ops', name: 'OPERATIONS', threat: 20, reclaim: 0.01 },
  { id: 'labs', name: 'MEDLAB', threat: 40, reclaim: 0.02 },
];

/** Assault the frontier in one-second steps. */
const push = (states = createGround(DEFS), force: number, seconds: number) => {
  let s = states;
  let exposure = 0;
  for (let t = 0; t < seconds; t++) {
    const r = assault(s, DEFS, force, 1);
    s = r.states;
    exposure += r.exposure;
  }
  return { states: s, exposure };
};

describe('held ground: taking it', () => {
  it('starts with every section lost and the frontier at the first', () => {
    const g = createGround(DEFS);
    expect(g).toHaveLength(3);
    expect(g.every((s) => s.control === 0 && s.garrison === 0 && !s.secured)).toBe(true);
    expect(frontier(g)).toBe(0);
    expect(held(g)).toBe(0);
  });

  it('secures a section in a fixed time when the force matches its threat', () => {
    const { states } = push(undefined, 10, ASSAULT_SECONDS);
    expect(isSecured(states[0]!)).toBe(true);
    expect(frontier(states)).toBe(1);
    expect(held(states)).toBe(1);
  });

  it('takes ground faster with more force, slower with less', () => {
    const strong = push(undefined, 20, ASSAULT_SECONDS / 4).states[0]!.control;
    const matched = push(undefined, 10, ASSAULT_SECONDS / 4).states[0]!.control;
    const weak = push(undefined, 5, ASSAULT_SECONDS / 4).states[0]!.control;
    expect(strong).toBeGreaterThan(matched);
    expect(matched).toBeGreaterThan(weak);
    expect(weak).toBeGreaterThan(0);
  });

  it('only ever assaults the frontier, one section at a time, in order', () => {
    // Overwhelming force takes a section in a quarter of the standard time; give it a little longer than that.
    const { states } = push(undefined, 1000, ASSAULT_SECONDS / 4 + 2);
    expect(isSecured(states[0]!)).toBe(true);
    expect(states[1]!.control).toBeGreaterThan(0);
    expect(states[1]!.control).toBeLessThan(1);
    expect(states[2]!.control).toBe(0);
  });

  it('exposes the attackers more when they are outmatched', () => {
    const outmatched = assault(createGround(DEFS), DEFS, 5, 1).exposure;
    const matched = assault(createGround(DEFS), DEFS, 10, 1).exposure;
    const overwhelming = assault(createGround(DEFS), DEFS, 40, 1).exposure;
    expect(outmatched).toBeGreaterThan(matched);
    expect(matched).toBeGreaterThan(overwhelming);
  });

  it('has nothing left to assault once everything is secured', () => {
    const { states } = push(undefined, 1000, ASSAULT_SECONDS * 3);
    expect(frontier(states)).toBe(DEFS.length);
    expect(assault(states, DEFS, 1000, 1)).toEqual({ states, exposure: 0 });
  });
});

describe('held ground: keeping it', () => {
  const taken = () => push(undefined, 1000, ASSAULT_SECONDS * 2).states;

  it('slips back when nobody holds it, and the frontier falls back to it', () => {
    const later = tickGround(taken(), DEFS, 90, 1);
    expect(later[0]!.control).toBeLessThan(1);
    expect(frontier(later)).toBe(0);
  });

  it('stays held while contested, and is lost only once control falls below the line', () => {
    const slipping = tickGround(taken(), DEFS, 10, 1);
    expect(slipping[0]!.control).toBeLessThan(1);
    expect(isSecured(slipping[0]!)).toBe(true);
    expect(frontier(slipping)).toBe(frontier(taken()));
    const gone = tickGround(taken(), DEFS, (1 - LOST_BELOW) / DEFS[0]!.reclaim + 1, 1);
    expect(isSecured(gone[0]!)).toBe(false);
    expect(frontier(gone)).toBe(0);
  });

  it('wins contested ground back when the garrison covers it again', () => {
    const slipping = tickGround(taken(), DEFS, 20, 1);
    const recovered = tickGround(setGarrison(slipping, 0, 10), DEFS, 200, 1);
    expect(recovered[0]!.control).toBe(1);
  });

  it('stays secured while the garrison covers its threat', () => {
    let g = setGarrison(taken(), 0, 10);
    g = setGarrison(g, 1, 20);
    const later = tickGround(g, DEFS, 600, 1);
    expect(held(later)).toBe(2);
  });

  it('slips more slowly with a partial garrison than with none', () => {
    const none = tickGround(taken(), DEFS, 30, 1)[0]!.control;
    const half = tickGround(setGarrison(taken(), 0, 5), DEFS, 30, 1)[0]!.control;
    expect(half).toBeGreaterThan(none);
    expect(half).toBeLessThan(1);
  });

  it('slips faster under pressure', () => {
    const calm = tickGround(taken(), DEFS, 30, 1)[0]!.control;
    const pressed = tickGround(taken(), DEFS, 30, 3)[0]!.control;
    expect(pressed).toBeLessThan(calm);
  });

  it('leaves the frontier to the assault: a half-taken section does not slip back on its own', () => {
    const half = push(undefined, 10, ASSAULT_SECONDS / 2).states;
    expect(tickGround(half, DEFS, 600, 5)[0]!.control).toBeCloseTo(half[0]!.control);
  });

  it('never drops below lost', () => {
    expect(tickGround(taken(), DEFS, 1e6, 10).every((s) => s.control === 0)).toBe(true);
  });

  it('counts the bodies tied down holding ground', () => {
    const g = setGarrison(setGarrison(taken(), 0, 4), 1, 6);
    expect(upkeep(g)).toBe(10);
  });

  it('cannot garrison a section that has not been taken', () => {
    const g = createGround(DEFS);
    expect(setGarrison(g, 2, 5)).toBe(g);
  });
});
