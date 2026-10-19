import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import { runBeats, STORY_MIN_GAP, type Beat, type MissionContext } from '../../src/mission/story';
import { depth } from '../../src/mission/extraction/progress';

const ctx: MissionContext = { cycle: 0, endings: [] };
const fresh = (patch: Partial<MissionState> = {}): MissionState => ({
  ...createMission(DEFAULT_MISSION_CONFIG, 1),
  ...patch,
});

const beat = (id: string, when: Beat['when'], extra: Partial<Beat> = {}): Beat => ({
  id,
  when,
  entries: [{ kind: 'sys', text: `beat ${id}` }],
  ...extra,
});

describe('story engine', () => {
  it('fires a beat when its condition holds, logging its entries', () => {
    const m = runBeats(fresh({ lifetimeOre: 10 }), [beat('a', ({ m }) => m.lifetimeOre >= 10)], ctx);
    expect(m.log.at(-1)!.text).toBe('beat a');
    expect(m.beats.a).toBe(m.elapsed);
  });

  it('never fires the same beat twice', () => {
    const beats = [beat('a', () => true)];
    let m = runBeats(fresh(), beats, ctx);
    const count = m.log.length;
    m = runBeats({ ...m, elapsed: m.elapsed + 1000 }, beats, ctx);
    expect(m.log.length).toBe(count);
  });

  it('fires at most one beat per tick, in table order', () => {
    const beats = [beat('a', () => true), beat('b', () => true)];
    const m = runBeats(fresh(), beats, ctx);
    expect(Object.keys(m.beats)).toEqual(['a']);
  });

  it('spaces beats out so the log never dumps a wall of text', () => {
    const beats = [beat('a', () => true), beat('b', () => true)];
    let m = runBeats(fresh(), beats, ctx);
    m = runBeats({ ...m, elapsed: m.elapsed + STORY_MIN_GAP - 1 }, beats, ctx);
    expect(m.beats.b).toBeUndefined();
    m = runBeats({ ...m, elapsed: m.elapsed + 2 }, beats, ctx);
    expect(m.beats.b).toBeDefined();
  });

  it('lets urgent beats ignore the spacing (e.g. an immediate correction)', () => {
    const beats = [beat('a', () => true), beat('b', () => true, { urgent: true })];
    let m = runBeats(fresh(), beats, ctx);
    m = runBeats(m, beats, ctx);
    expect(m.beats.b).toBeDefined();
  });

  it('applies effects: setting the act and flags', () => {
    const m = runBeats(fresh(), [beat('a', () => true, { effects: [{ kind: 'setAct', act: 2 }, { kind: 'setFlag', flag: 'x' }] })], ctx);
    expect(m.act).toBe(2);
    expect(m.flags).toContain('x');
  });

  it('gives conditions the mission context (e.g. how many contracts came before)', () => {
    const beats = [beat('veteran', ({ ctx }) => ctx.cycle > 0)];
    expect(runBeats(fresh(), beats, { cycle: 0, endings: [] }).beats.veteran).toBeUndefined();
    expect(runBeats(fresh(), beats, { cycle: 1, endings: [] }).beats.veteran).toBeDefined();
  });
});

describe('a new mission', () => {
  it('starts in act 1 with no story fired', () => {
    const m = fresh();
    expect(m.act).toBe(1);
    expect(m.beats).toEqual({});
    expect(m.flags).toEqual([]);
  });
});

describe('shaft depth', () => {
  it('starts at zero and deepens as ore is extracted', () => {
    expect(depth(fresh())).toBe(0);
    const depths = [10, 1e3, 1e6, 1e9, 1e12].map((ore) => depth(fresh({ lifetimeOre: ore })));
    for (let i = 1; i < depths.length; i++) expect(depths[i]).toBeGreaterThan(depths[i - 1]!);
  });

  it('is a whole number of metres', () => {
    expect(Number.isInteger(depth(fresh({ lifetimeOre: 12345 })))).toBe(true);
  });
});

describe('story effects that change the world', () => {
  it('can force a containment breach', () => {
    const m = runBeats(fresh({ specimens: 10 }), [beat('a', () => true, { effects: [{ kind: 'breach' }] })], ctx);
    expect(m.breaches).toBe(1);
    expect(m.contacts).toBeGreaterThan(0);
  });
});
