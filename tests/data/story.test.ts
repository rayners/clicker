import { describe, it, expect } from 'vitest';
import { STORY } from '../../src/data/story';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import { runBeats, STORY_MIN_GAP } from '../../src/mission/story';
import { GENERATORS } from '../../src/data/generators';

describe('story content', () => {
  it('has unique beat ids', () => {
    expect(new Set(STORY.map((b) => b.id)).size).toBe(STORY.length);
  });

  it('gives every beat something to say', () => {
    for (const b of STORY) {
      expect(b.entries.length).toBeGreaterThan(0);
      for (const e of b.entries) expect(e.text.length).toBeGreaterThan(0);
    }
  });

  it('has an entry beat for act 2', () => {
    expect(STORY.some((b) => b.effects?.some((e) => e.kind === 'setAct' && e.act === 2))).toBe(true);
  });

  it('can reach every act 1 and act 2 beat by playing deep into act 2', () => {
    // A well-progressed act-2 mission: every generator up to the habitat owned, deep shaft.
    let m: MissionState = {
      ...createMission(DEFAULT_MISSION_CONFIG, 1),
      lifetimeOre: 5e9,
      generators: Object.fromEntries(GENERATORS.map((g, i) => [g.id, i < 6 ? 1 : 0])),
    };
    const early = STORY.filter((b) => (b.act ?? 1) <= 2);
    for (let i = 0; i < early.length * 3; i++) {
      m = runBeats({ ...m, elapsed: m.elapsed + STORY_MIN_GAP + 1 }, STORY, { cycle: 0 });
    }
    const missing = early.filter((b) => m.beats[b.id] === undefined).map((b) => b.id);
    expect(missing).toEqual([]);
    expect(m.act).toBeGreaterThanOrEqual(2);
  });

  it('keeps act 1 free of anything overtly sinister on a first contract', () => {
    const act1 = STORY.filter((b) => (b.act ?? 1) === 1);
    for (const b of act1) for (const e of b.entries) expect(e.kind).not.toBe('anomaly');
  });
});

describe('later acts', () => {
  it('has entry beats for acts 3 and 4', () => {
    for (const act of [3, 4]) {
      expect(STORY.some((b) => b.effects?.some((e) => e.kind === 'setAct' && e.act === act))).toBe(true);
    }
  });

  it('can reach every act 3 and act 4 beat through play', () => {
    let m: MissionState = {
      ...createMission(DEFAULT_MISSION_CONFIG, 1),
      lifetimeOre: 5e9,
      generators: Object.fromEntries(GENERATORS.map((g, i) => [g.id, i < 6 ? 1 : 0])),
    };
    const step = (patch: Partial<MissionState> = {}, times = 40) => {
      for (let i = 0; i < times; i++) {
        m = runBeats({ ...m, ...patch, elapsed: m.elapsed + STORY_MIN_GAP + 61 }, STORY, { cycle: 0 });
      }
    };
    step(); // finish acts 1-2
    step({ lifetimeOre: 2e10 }); // breach the cavity: act 3 opens, special projects begin
    expect(m.act).toBe(3);
    // Recover specimens, build the habitat, let containment sag.
    step({ specimens: 8, integrity: 40, generators: { ...m.generators, habitat: 1 } });
    // Specimens pile up until a breach is forced; crew start disappearing.
    step({ specimens: 25 });
    expect(m.act).toBe(4);
    const lost = Object.fromEntries(Object.keys(m.crew).map((id) => [id, { status: 'lost' as const, fatigue: 0 }]));
    step({ contacts: 5, crew: lost });

    const later = STORY.filter((b) => (b.act ?? 1) >= 3);
    expect(later.filter((b) => m.beats[b.id] === undefined).map((b) => b.id)).toEqual([]);
    expect(m.flags).toContain('terminus');
  });
});
