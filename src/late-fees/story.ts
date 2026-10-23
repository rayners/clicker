import { runBeats, sinceBeat } from '../engine/story';
import type { RunBeat, Signals, StoryArgs } from './kinds';
import type { EntryKind, Run } from './state';

export const STORY_MIN_GAP = 20;
export const ACT_TWO_AT = 1_000;
export const FINAL_GIRL_AT = 3_200;
/** Minutes from the final girl working it out to the killer coming for everyone, and from then to the credits. */
export const CONFRONTATION_AFTER = 25 * 60;
export const CREDITS_AFTER = 75 * 60;

/** What a killer says at each turn of the film. Text may use the venue's {placeholders}. */
export interface ActTexts {
  opening: string;
  bodyCount: string;
  finalGirl: string;
  confrontation: string;
  credits: string;
}

/**
 * The shape every film shares: a kill on the first night, the body count, the final girl, the confrontation, the
 * credits. Killers supply the words; the timing is the same for all of them, so pacing is tuned once.
 */
export function actBeats(id: string, t: ActTexts): RunBeat[] {
  return [
    { id: `${id}-opening`, urgent: true, when: ({ signals }: StoryArgs) => signals.night, entries: [{ kind: 'kill', text: t.opening }] },
    {
      id: 'act-2',
      act: 2,
      when: ({ signals }) => signals.progress >= ACT_TWO_AT,
      entries: [{ kind: 'news', text: t.bodyCount }],
      effects: [{ kind: 'setAct', act: 2 }],
    },
    {
      id: 'act-3',
      act: 3,
      urgent: true,
      when: ({ r, signals }) => r.act >= 2 && signals.progress >= FINAL_GIRL_AT && signals.deep,
      entries: [{ kind: 'staff', text: t.finalGirl }],
      effects: [
        { kind: 'setAct', act: 3 },
        { kind: 'setFlag', flag: 'final-girl' },
      ],
    },
    {
      id: 'act-4',
      act: 4,
      urgent: true,
      when: ({ r }) => sinceBeat(r, 'act-3') >= CONFRONTATION_AFTER,
      entries: [{ kind: 'kill', text: t.confrontation }],
      effects: [{ kind: 'setAct', act: 4 }],
    },
    {
      id: 'credits',
      act: 4,
      urgent: true,
      when: ({ r }) => sinceBeat(r, 'act-4') >= CREDITS_AFTER,
      entries: [{ kind: 'osd', text: t.credits }],
      effects: [{ kind: 'setFlag', flag: 'terminus' }],
    },
  ];
}

export function runStory(r: Run, beats: readonly RunBeat[], signals: Signals, lexicon: Record<string, string>): Run {
  return runBeats<EntryKind, Run, StoryArgs>(r, beats, { r, signals }, { minGap: STORY_MIN_GAP, lexicon });
}

/** Seconds until the credits roll, once the confrontation has begun; null before it and after the credits. */
export function creditsIn(r: Run): number | null {
  if (r.flags.includes('terminus') || r.beats['act-4'] === undefined) return null;
  return Math.max(0, CREDITS_AFTER - sinceBeat(r, 'act-4'));
}
