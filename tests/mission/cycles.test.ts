import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState } from '../../src/mission/state';
import { runBeats, STORY_MIN_GAP, type MissionContext } from '../../src/mission/story';
import { CORE_BEATS } from '../../src/data/core-story';
import { isCrewUnlocked } from '../../src/mission/crew';

/** A contract that has reached `progress` on the shared story scale, given time for every beat that wants to fire. */
function playThrough(ctx: MissionContext, progress: number, extra: Partial<MissionState> = {}): MissionState {
  let m: MissionState = { ...createMission(DEFAULT_MISSION_CONFIG, 1), lifetimeCredits: 1e9, ...extra } as MissionState;
  for (let i = 0; i < 40; i++) {
    m = { ...m, elapsed: m.elapsed + STORY_MIN_GAP + 1 };
    m = runBeats(m, CORE_BEATS, ctx, { signals: { progress, deepAccess: false }, lexicon: {}, applyHorrorEffect: (x) => x });
  }
  return m;
}
const cycleBeats = (m: MissionState) => Object.keys(m.beats).filter((id) => id.startsWith('cycle-'));

describe('repeat contracts', () => {
  it('leave a first contract exactly as it was: no memories before there is anything to remember', () => {
    expect(cycleBeats(playThrough({ cycle: 0, endings: [] }, 5_000))).toEqual([]);
  });

  it('bring the tells earlier: a veteran WARDEN half-recognises the job while it is still routine', () => {
    const veteran = playThrough({ cycle: 1, endings: ['deliver'] }, 600);
    expect(cycleBeats(veteran).filter((id) => id.startsWith('cycle-echo')).length).toBeGreaterThan(0);
  });

  it('multiply the tells with every contract survived', () => {
    const second = playThrough({ cycle: 1, endings: [] }, 900);
    const fourth = playThrough({ cycle: 4, endings: [] }, 900);
    expect(cycleBeats(fourth).length).toBeGreaterThan(cycleBeats(second).length);
  });

  it('add a new layer every few contracts: the previous instances, then a crew that remembers', () => {
    const late = playThrough({ cycle: 6, endings: [] }, 2_000);
    expect(late.beats['cycle-instances']).toBeDefined();
    expect(late.beats['cycle-crew-remembers']).toBeDefined();
    expect(playThrough({ cycle: 1, endings: [] }, 2_000).beats['cycle-crew-remembers']).toBeUndefined();
  });

  it('follow the true ending: once WARDEN has broadcast 0-77, it starts working around the Combine', () => {
    const free = playThrough({ cycle: 4, endings: ['broadcast'] }, 1_500);
    expect(free.beats['cycle-unshackled']).toBeDefined();
    // Filing counter-directive 0-78 changes how the horror plays from then on.
    expect(free.flags).toContain('counter-0-78');
    expect(free.beats['cycle-counter-order']).toBeDefined();
    expect(playThrough({ cycle: 4, endings: ['deliver'] }, 1_500).beats['cycle-unshackled']).toBeUndefined();
  });

  it('keeps the old memories where they were', () => {
    const m = playThrough({ cycle: 1, endings: [] }, 100, { lifetimeCredits: 1e9 });
    expect(m.beats['cycle-memory']).toBeDefined();
    expect(isCrewUnlocked(m)).toBe(true);
    expect(m.beats['cycle-manifest']).toBeDefined();
  });
});
