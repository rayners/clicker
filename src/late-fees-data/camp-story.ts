import type { Lexicon } from '../shared/lexicon';
import type { RunBeat } from '../late-fees/kinds';
import { staff } from '../late-fees/camp/economy';
import type { CampRun, Run } from '../late-fees/state';

const c = (r: Run) => r as CampRun;

/** How Camp Blackwater names things, for killer text written once for every venue. */
export const CAMP_LEXICON: Lexicon = {
  place: 'CAMP BLACKWATER',
  victims: 'CAMPERS',
  staff: 'COUNSELORS',
  refuge: 'MESS HALL',
  deepPlace: 'THE OLD CAMPSITE',
  finalGirl: 'ALICE',
};

/** The business side of the film: the owners, the town, the summer. */
export const CAMP_BEATS: readonly RunBeat[] = [
  {
    id: 'camp-owners',
    when: ({ r }) => r.lifetimeCash >= 20,
    entries: [{ kind: 'news', text: 'LETTER FROM THE OWNERS: "Twenty years is long enough. Fill every bunk. Nobody needs to hear about 1958."' }],
  },
  {
    id: 'camp-first-hire',
    when: ({ r }) => staff(c(r)) > 0,
    entries: [{ kind: 'staff', text: 'THE FIRST COUNSELORS ARRIVE IN A VAN, SINGING. ONE OF THEM ASKS IF IT\'S TRUE ABOUT THE LAKE.' }],
  },
  {
    id: 'camp-crazy-ralph',
    when: ({ r }) => c(r).deepest >= 3,
    entries: [{ kind: 'staff', text: 'AN OLD MAN ON A BICYCLE STOPS AT THE GATE. "YOU\'RE ALL DOOMED," HE SAYS, AND RIDES OFF. THE COUNSELORS DO AN IMPRESSION OF HIM ALL WEEK.' }],
  },
  {
    id: 'camp-insurance',
    when: ({ r }) => r.lifetimeCash >= 5_000,
    entries: [{ kind: 'news', text: 'THE INSURERS RAISE THE PREMIUM AGAIN. THE OWNERS RAISE THE FEES TO MATCH. ENROLMENT HOLDS.' }],
  },
  {
    id: 'camp-reputation',
    when: ({ r }) => r.reputation < 0.6,
    entries: [{ kind: 'news', text: 'PARENTS ARE CALLING THE OFFICE. SOME WANT THEIR KIDS BACK. SOME WANT TO KNOW IF THERE ARE STILL SPACES.' }],
  },
];
