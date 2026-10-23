import type { GuideRules, GuideStep } from '../engine/guide';
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

/** The walkthrough: each lever as it first matters. */
export const GUIDE_STEPS: readonly GuideStep<Works>[] = [
  { id: 'make', title: 'MAKE A CLIP', text: 'Tap the big button to bend an inch of wire into a clip. Clips sell on their own at the price you set.', target: '.make', show: () => true, done: (w) => w.made >= 10 },
  { id: 'price', title: 'PRICE', text: 'Cheaper clips sell faster; dearer ones earn more each. Find the price where the pile stays small.', target: '.price', show: (w) => w.made >= 10, done: (w) => w.price !== 0.05 },
  { id: 'wire', title: 'WIRE', text: 'Every clip is an inch of wire. Buy a spool in WORKS before the bench runs dry; its price moves.', show: (w) => w.wire < 500, done: (w) => w.wire > 1_000 || w.autoclippers > 0 },
  { id: 'clippers', title: 'AUTOCLIPPERS', text: 'An autoclipper bends a clip a second for you. Each costs a little more than the last.', show: (w) => w.funds >= 5, done: (w) => w.autoclippers > 0 },
];

export const GUIDE_RULES: GuideRules = {
  title: 'HOW CLIP WORKS WORKS',
  sections: [
    { heading: 'CLIPS', text: 'Each clip takes an inch of wire. Make them by hand, or buy autoclippers to make them for you.' },
    { heading: 'SALES', text: 'People buy clips every second. How many depends on the price and on marketing; what you earn is what they buy times the price.' },
    { heading: 'WIRE', text: 'Wire comes by the spool, and its price drifts every ten seconds. Buy low if you can wait.' },
    { heading: 'THE MILLION', text: 'At a million clips, sell the works or hand it on, and start again with good will: more customers from the first day.' },
  ],
};
