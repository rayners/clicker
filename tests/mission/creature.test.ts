import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, SECURITY_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { tickMission } from '../../src/mission/tick';
import { HORRORS, SCENARIOS } from '../../src/mission/registry';
import { horrorPressure } from '../../src/mission/horrors';
import { CREATURE_ALARM_AT } from '../../src/mission/creature';
import { placeholders } from '../../src/engine/lexicon';

type C = MissionOf<'extraction', 'creature'>;
const config = { ...DEFAULT_MISSION_CONFIG, horror: 'creature' as const };
const fresh = (patch: Partial<C> = {}): C => ({ ...createMission(config, 1), generators: { ...createMission(config, 1).generators, drone: 30 }, ...patch });
const run = <M extends C>(m: M, seconds: number): M => {
  let next = m;
  for (let t = 0; t < seconds; t++) next = tickMission(next, 1) as M;
  return next;
};

describe('the creature (a horror the player drives)', () => {
  it('does nothing while nothing pushes it', () => {
    const later = run(fresh(), 600);
    expect(later.taken).toBe(0);
  });

  it('takes equipment and crew where it is pushed, logging each', () => {
    const later = run(fresh({ push: 3 }), 900);
    expect(later.taken).toBeGreaterThan(0);
    expect(later.log.some((e) => e.kind === 'anomaly' || /SIGNAL LOST|OFFLINE|NO SIGNAL/.test(e.text))).toBe(true);
  });

  it('presses on held ground: a security contract\'s sectors slip faster', () => {
    const m = createMission({ ...SECURITY_MISSION_CONFIG, horror: 'creature' }, 1);
    expect(horrorPressure({ ...m, push: 2 })).toBeGreaterThan(horrorPressure(m));
  });

  it('is noticed: acts turn as it takes more, until WARDEN vents every deck', () => {
    const noticed = run(fresh({ push: 1, suspicion: Math.ceil(CREATURE_ALARM_AT / 3) + 2 }), 300);
    expect(noticed.act).toBeGreaterThanOrEqual(2);
    const vented = run(fresh({ push: 1, suspicion: CREATURE_ALARM_AT + 2, act: 3 }), 300);
    expect(vented.flags).toContain('terminus');
  });

  it('is forgotten if it holds off: WARDEN\'s suspicion fades while nothing goes missing', () => {
    const wary = run(fresh({ push: 3 }), 600);
    expect(wary.suspicion).toBeGreaterThan(0);
    expect(run({ ...wary, push: 0 }, 600).suspicion).toBeLessThan(wary.suspicion);
  });

  it('uses no words a scenario has not supplied', () => {
    const texts = HORRORS.creature.beats.flatMap((b) => b.entries.map((e) => e.text));
    for (const s of Object.values(SCENARIOS)) {
      expect(texts.flatMap(placeholders).filter((k) => !(k in s.lexicon))).toEqual([]);
    }
  });
});
