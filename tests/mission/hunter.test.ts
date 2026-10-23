import { describe, it, expect } from 'vitest';
import { createMission, SECURITY_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { HORRORS, SCENARIOS } from '../../src/mission/registry';
import { HUNTER_ARMED_AT, HUNTER_DRIVEN_AT } from '../../src/mission/hunter';
import { TROOPERS } from '../../src/data/security/systems';
import { placeholders } from '../../src/engine/lexicon';

type H = MissionOf<'security', 'hunter'>;
const config = { ...SECURITY_MISSION_CONFIG, horror: 'hunter' as const };
const fresh = (patch: Partial<H> = {}): H => {
  const m = createMission(config, 1) as H;
  return { ...m, troopers: { ...m.troopers, [TROOPERS[0]!.id]: 40 }, ...patch };
};
const run = <M extends H>(m: M, seconds: number): M => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1) as M;
  return next;
};
const awake = (m: H): H => ({ ...m, crew: { ...m.crew, okonkwo: { status: 'awake', fatigue: 0 } } });

describe('the hunter (a horror the player drives, under an honour code)', () => {
  it('does nothing while nothing pushes it', () => {
    const later = run(fresh(), 600);
    expect(later.trophies).toBe(0);
    expect(later.alert).toBe(0);
  });

  it('takes nothing from a crew that has not seen it: it only lets itself be glimpsed', () => {
    const later = run(fresh({ push: 1 }), 200);
    expect(later.trophies).toBe(0);
    expect(later.alert).toBeGreaterThan(0);
    expect(later.log.some((e) => e.kind === 'anomaly')).toBe(true);
  });

  it('hunts a crew that is armed and looking, and takes trophies', () => {
    const later = run(fresh({ push: 2, alert: HUNTER_ARMED_AT }), 600);
    expect(later.trophies).toBeGreaterThan(0);
  });

  it('prizes the crew who walk the decks over equipment, and never takes a sleeper', () => {
    const later = run(awake(fresh({ push: 3, alert: HUNTER_ARMED_AT })), 600);
    expect(later.crew.okonkwo!.status).toBe('lost');
    expect(Object.entries(later.crew).filter(([id, c]) => id !== 'okonkwo' && c.status === 'lost')).toEqual([]);
  });

  it('is driven off by a crew that has hunted it long enough', () => {
    const driven = run(fresh({ push: 2, alert: HUNTER_DRIVEN_AT - 1, act: 3 }), 300);
    expect(driven.flags).toContain('terminus');
  });

  it('is forgotten if it holds off: the crew stand down while nothing is seen', () => {
    const wary = run(fresh({ push: 2 }), 600);
    expect(run({ ...wary, push: 0 }, 600).alert).toBeLessThan(wary.alert);
  });

  it('uses no words a scenario has not supplied', () => {
    const texts = HORRORS.hunter.beats.flatMap((b) => b.entries.map((e) => e.text));
    for (const s of Object.values(SCENARIOS)) expect(texts.flatMap(placeholders).filter((k) => !(k in s.lexicon))).toEqual([]);
  });
});
