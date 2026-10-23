import type { Lexicon } from '../engine/lexicon';
import type { EndingText, RunBeat } from '../late-fees/kinds';
import { bookRate } from '../late-fees/insurer/economy';
import type { InsurerRun, Run } from '../late-fees/state';

const i = (r: Run) => r as InsurerRun;

/** How Providence Mutual names things, for killer text written once for every venue. */
export const INSURER_LEXICON: Lexicon = {
  place: 'PROVIDENCE MUTUAL',
  victims: 'POLICYHOLDERS',
  staff: 'CLAIMS ADJUSTERS',
  refuge: 'CLAIMS OFFICE',
  deepPlace: 'THE CRASH SITE',
  finalGirl: 'CORA',
};

/** The business side: underwriting, the regulators, the press. */
export const INSURER_BEATS: readonly RunBeat[] = [
  {
    id: 'ins-board',
    when: ({ r }) => r.lifetimeCash >= 20,
    entries: [{ kind: 'news', text: 'MEMO FROM THE BOARD: "Forty healthy young people who just survived a plane crash. Statistically, the safest book we will ever write."' }],
  },
  {
    id: 'ins-first-policy',
    when: ({ r }) => bookRate(i(r)) > 0,
    entries: [{ kind: 'staff', text: 'THE FIRST SURVIVOR SIGNS. SHE ASKS IF THE POLICY COVERS "THINGS THAT WERE SUPPOSED TO HAPPEN". LEGAL SAYS IT DOES NOT SAY.' }],
  },
  {
    id: 'ins-list',
    when: ({ r }) => i(r).list.length < 38,
    entries: [{ kind: 'staff', text: 'AN ADJUSTER NOTICES THE CLAIMS ARE COMING IN IN SEAT ORDER. ROW 31, THEN ROW 32. SHE PINS THE SEATING CHART TO THE WALL.' }],
  },
  {
    id: 'ins-regulator',
    when: ({ r }) => r.lifetimeCash >= 5_000,
    entries: [{ kind: 'news', text: 'THE STATE INSURANCE REGULATOR ASKS WHY THE COMPANY KEEPS WRITING POLICIES ON PEOPLE WHO KEEP DYING. THE COMPANY POINTS TO ITS PROFITS.' }],
  },
  {
    id: 'ins-reputation',
    when: ({ r }) => r.reputation < 0.6,
    entries: [{ kind: 'news', text: 'A TABLOID CALLS PROVIDENCE MUTUAL "THE DEATH POLICY". SALES DOUBLE. EVERYONE WANTS TO BE COVERED WHEN IT COMES FOR THEM.' }],
  },
];

export const INSURER_ENDINGS: Readonly<Record<'sell' | 'burn', EndingText>> = {
  sell: {
    title: 'SELL THE BOOK',
    text: 'You sell every policy to a larger insurer for a fortune and do not mention the pattern. The buyer\'s actuaries notice within a week. By then you are on a plane. You check your seat number twice.',
  },
  burn: {
    title: 'TEAR UP THE LIST',
    text: 'You shred the seating chart, cancel every policy, and close Providence Mutual for good. Without a list to follow, whatever was hunting the survivors loses the thread. There will be no Part {nextPart}. Not for you.',
  },
};
