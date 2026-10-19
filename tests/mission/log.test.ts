import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG } from '../../src/mission/state';
import { appendLog, LOG_LIMIT } from '../../src/mission/log';

const fresh = () => createMission(DEFAULT_MISSION_CONFIG, 1);

describe('mission log', () => {
  it('opens with WARDEN coming online aboard the configured ship', () => {
    const m = fresh();
    expect(m.log.length).toBeGreaterThan(0);
    expect(m.log.map((e) => e.text).join('\n')).toContain(DEFAULT_MISSION_CONFIG.shipName.toUpperCase());
  });

  it('appends entries stamped with mission time and a stable increasing id', () => {
    const m = { ...fresh(), elapsed: 42 };
    const after = appendLog(m, 'corp', 'Quarterly targets attached.');
    const last = after.log[after.log.length - 1]!;
    expect(last).toMatchObject({ t: 42, kind: 'corp', text: 'Quarterly targets attached.' });
    expect(last.id).toBeGreaterThan(m.log[m.log.length - 1]!.id);
  });

  it('keeps only the most recent entries', () => {
    let m = fresh();
    for (let i = 0; i < LOG_LIMIT + 20; i++) m = appendLog(m, 'sys', `line ${i}`);
    expect(m.log.length).toBe(LOG_LIMIT);
    expect(m.log[m.log.length - 1]!.text).toBe(`line ${LOG_LIMIT + 19}`);
  });
});
