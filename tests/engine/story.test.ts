import { describe, it, expect } from 'vitest';
import { newStory, runBeats, type Beat, type StoryHost } from '../../src/engine/story';

type Host = StoryHost<'note'> & { coins: number };
const BEATS: readonly Beat<Host, 'note'>[] = [
  { id: 'rich', when: (h) => h.coins >= 10, entries: [{ kind: 'note', text: 'Rich now.' }], effects: [{ kind: 'setAct', act: 2 }] },
];

describe('the story engine', () => {
  it('starts a story with everything a host needs: act one, no beats, no flags, an empty log counting from one', () => {
    expect(newStory()).toEqual({ elapsed: 0, act: 1, beats: {}, lastBeatAt: null, flags: [], log: [], nextLogId: 1 });
  });

  it('fires a beat once its moment comes, writing to the log and moving the act', () => {
    const host: Host = { ...newStory<'note'>(), coins: 10, elapsed: 5 };
    const next = runBeats<'note', Host, Host>(host, BEATS, host, { minGap: 30 });
    expect(next.act).toBe(2);
    expect(next.log.map((e) => e.text)).toEqual(['Rich now.']);
    expect(runBeats<'note', Host, Host>(next, BEATS, next, { minGap: 30 })).toBe(next);
  });
});
