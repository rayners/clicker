import { describe, it, expect } from 'vitest';
import { HORRORS } from '../../src/mission/horrors';
import { createMission, SECURITY_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import { SECTIONS } from '../../src/data/security/systems';
import type { Beat } from '../../src/mission/story';
import { CALDERS_LANDING_BEATS } from '../../src/data/outbreak/calders-landing';

const colony = (patch: object = {}) => ({ ...createMission({ ...SECURITY_MISSION_CONFIG, horror: 'outbreak' }, 1), ...patch }) as MissionState;
const ground = (held: number) => SECTIONS.map((_, i) => ({ control: i < held ? 1 : 0, garrison: 0, secured: i < held }));
const fires = (b: Beat, m: MissionState) => b.when({ m, ctx: { cycle: 0, endings: [] }, signals: { progress: 0, deepAccess: false } });
const beat = (id: string) => CALDERS_LANDING_BEATS.find((b) => b.id === id)!;

describe("Calder's Landing: the outbreak on a security contract", () => {
  it('is the outbreak\'s pairing for security, and nothing else', () => {
    expect(Object.keys(HORRORS.outbreak.pairings)).toEqual(['security']);
    expect(HORRORS.outbreak.pairings.security).toBe(CALDERS_LANDING_BEATS);
  });

  it('finds the dormitories empty and packed, with a colds note in medical, in act two', () => {
    const b = beat('cl-dormitories');
    expect(fires(b, colony({ act: 2, deepest: 4, ground: ground(4) }))).toBe(false);
    expect(fires(b, colony({ act: 2, deepest: 5, ground: ground(5) }))).toBe(true);
    expect(b.entries.map((e) => e.text).join(' ')).not.toMatch(/\bTURN|KA-11|BIOPRODUCTS/);
  });

  it('dates the strain in the medlab to before the colony went dark, after the discovery', () => {
    const b = beat('cl-medlab');
    expect(fires(b, colony({ act: 2, deepest: 7, ground: ground(7) }))).toBe(false);
    expect(fires(b, colony({ act: 3, deepest: 7, ground: ground(7), flags: ['outbreak'] }))).toBe(true);
  });

  it('puts the missing colonists among the first turned, and has them take back the tunnels they built', () => {
    expect(fires(beat('cl-name-tapes'), colony({ act: 4, turned: 0.05 }))).toBe(true);
    expect(fires(beat('cl-tunnels'), colony({ act: 4, deepest: 6, ground: ground(6) }))).toBe(false);
    expect(fires(beat('cl-tunnels'), colony({ act: 4, deepest: 6, ground: ground(4) }))).toBe(true);
  });
});
