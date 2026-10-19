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
