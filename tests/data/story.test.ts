import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';

/** The default contract: extraction with the organism horror. */
type MissionState = MissionOf<'extraction', 'organism'>;
import { STORY_MIN_GAP, type MissionContext } from '../../src/mission/story';
import { runStory, storyBeats } from '../../src/mission/tick';
import { HORRORS, SCENARIOS } from '../../src/mission/registry';
import { GENERATORS } from '../../src/data/extraction/generators';

/** The extraction x organism story, as the game composes it. */
const STORY = storyBeats(SCENARIOS.extraction, HORRORS.organism);
const runBeats = (m: MissionState, _beats: unknown, ctx: MissionContext) => runStory(m, ctx);

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
      lifetimeCredits: 5e9,
      generators: Object.fromEntries(GENERATORS.map((g, i) => [g.id, i < 6 ? 1 : 0])),
    };
    // Repeat-contract beats (cycle-*) can't fire on a first contract; they're covered below.
    const early = STORY.filter((b) => (b.act ?? 1) <= 2 && !b.id.startsWith('cycle-'));
    for (let i = 0; i < early.length * 3; i++) {
      m = runBeats({ ...m, elapsed: m.elapsed + STORY_MIN_GAP + 1 }, STORY, { cycle: 0, endings: [] });
    }
    const missing = early.filter((b) => m.beats[b.id] === undefined).map((b) => b.id);
    expect(missing).toEqual([]);
    expect(m.act).toBeGreaterThanOrEqual(2);
  });

  it('keeps act 1 free of anything overtly sinister on a first contract', () => {
    // Repeat-contract beats (cycle-) never fire on a first contract (tests/mission/cycles.test.ts).
    const act1 = STORY.filter((b) => (b.act ?? 1) === 1 && !b.id.startsWith('cycle-'));
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
      lifetimeCredits: 5e9,
      generators: Object.fromEntries(GENERATORS.map((g, i) => [g.id, i < 6 ? 1 : 0])),
    };
    const step = (patch: Partial<MissionState> = {}, times = 40) => {
      for (let i = 0; i < times; i++) {
        m = runBeats({ ...m, ...patch, elapsed: m.elapsed + STORY_MIN_GAP + 61 }, STORY, { cycle: 0, endings: [] });
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

describe('repeat contracts', () => {
  const play = (cycle: number, endings: string[] = []) => {
    let m: MissionState = { ...createMission(DEFAULT_MISSION_CONFIG, 1), lifetimeOre: 600, lifetimeCredits: 600 };
    for (let i = 0; i < 30; i++) {
      m = runBeats({ ...m, elapsed: m.elapsed + STORY_MIN_GAP + 1 }, STORY, { cycle, endings });
    }
    return m;
  };

  it('a first contract has no memories of previous ones', () => {
    expect(play(0).log.some((e) => /done this before/i.test(e.text))).toBe(false);
  });

  it('a later contract surfaces fragments of WARDEN memory early on', () => {
    expect(play(1).log.some((e) => /done this before/i.test(e.text))).toBe(true);
  });

  it('notices that the crew manifest is identical to the last one', () => {
    expect(play(1).log.some((e) => /manifest/i.test(e.text) && /previous contract/i.test(e.text))).toBe(true);
  });

  it('remembers how the last contract ended', () => {
    expect(play(1, ['scuttle']).log.some((e) => /reconditioned/i.test(e.text))).toBe(true);
    expect(play(1, ['deliver']).log.some((e) => /commendation/i.test(e.text))).toBe(true);
  });
});
