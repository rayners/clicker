import type { Beat } from '../engine/story';
import type { Works } from './works';

/** Kinds of log line: the works' own notes, and letters from the trade. */
export type NoteKind = 'note' | 'letter';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Shown once the works has made this many clips. */
  after: number;
}

export const UPGRADES: readonly Upgrade[] = [
  { id: 'sharper-dies', name: 'Sharper dies', description: 'Autoclippers bend half again as fast.', cost: 50, after: 200 },
  { id: 'longer-spools', name: 'Longer spools', description: 'Each spool of wire runs 1,500 inches.', cost: 80, after: 500 },
  { id: 'wire-buyer', name: 'Standing wire order', description: 'Buys a spool whenever the bench runs dry.', cost: 200, after: 1_000 },
  { id: 'jingle', name: 'A jingle', description: 'Half again as many people want clips.', cost: 500, after: 2_000 },
  { id: 'megaclippers', name: 'Megaclippers', description: 'Autoclippers bend three times as fast.', cost: 5_000, after: 20_000 },
];

export const BEATS: readonly Beat<{ w: Works }, NoteKind>[] = [
  { id: 'first-hundred', when: ({ w }) => w.made >= 100, entries: [{ kind: 'note', text: 'A hundred clips. The jar by the till is filling.' }] },
  {
    id: 'automation',
    act: 2,
    when: ({ w }) => w.made >= 2_000,
    entries: [{ kind: 'letter', text: 'LETTER: The stationers on Fourth Street would like to stock your clips. All of them.' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
  { id: 'wire-talk', act: 2, when: ({ w }) => w.made >= 10_000, entries: [{ kind: 'note', text: 'The wire merchant asks what we are doing with it all.' }] },
  {
    id: 'factory',
    act: 3,
    when: ({ w }) => w.made >= 100_000,
    entries: [{ kind: 'letter', text: 'LETTER: A buyer from the capital. They have heard of us. Everyone has.' }],
    effects: [{ kind: 'setAct', act: 3 }],
  },
  {
    id: 'million',
    act: 3,
    when: ({ w }) => w.made >= 1_000_000,
    entries: [{ kind: 'note', text: 'One million clips. Time to decide what the works is for.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
    urgent: true,
  },
];
