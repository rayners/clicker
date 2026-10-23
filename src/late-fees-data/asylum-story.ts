import type { Lexicon } from '../engine/lexicon';
import type { EndingText, RunBeat } from '../late-fees/kinds';
import { patients } from '../late-fees/asylum/economy';
import type { AsylumRun, Run } from '../late-fees/state';

const a = (r: Run) => r as AsylumRun;

/** How the hospital names things, for killer text written once for every venue. */
export const ASYLUM_LEXICON: Lexicon = {
  place: 'GRAYHAVEN STATE HOSPITAL',
  victims: 'PATIENTS',
  staff: 'ORDERLIES',
  refuge: "NURSES' STATION",
  deepPlace: 'WARD TEN',
  finalGirl: 'MAREN',
};

/** The business side: the state, the inspector, the town below the hill, and the day itself. */
export const ASYLUM_BEATS: readonly RunBeat[] = [
  {
    id: 'asylum-budget',
    when: ({ r }) => r.lifetimeCash >= 20,
    entries: [{ kind: 'news', text: 'MEMO FROM THE COUNTY: "Funding is per bed filled, Superintendent. Fill them. The inspector visits monthly, and she counts the syringes."' }],
  },
  {
    id: 'asylum-first-patient',
    when: ({ r }) => patients(a(r)) > 0,
    entries: [{ kind: 'staff', text: 'THE FIRST TRANSFER ARRIVES IN A COUNTY VAN. THE DRIVER ASKS WHICH WAY TO WARD TEN, AND THEN DECIDES HE DOESN\'T WANT TO KNOW.' }],
  },
  {
    id: 'asylum-calendar',
    when: ({ r }) => patients(a(r)) >= 10,
    entries: [{ kind: 'news', text: 'MILLBROOK IS ALREADY DECORATING FOR NATIONAL CANDY CORN DAY. PAPER BATS IN THE DINER WINDOW. THE PATIENTS CAN SEE THE LIGHTS FROM THE HILL.' }],
  },
  {
    id: 'asylum-inspector',
    when: ({ r }) => a(r).rating < 0.6,
    entries: [{ kind: 'news', text: 'THE STATE INSPECTOR\'S REPORT: "Patients observed sedated past the point of care." THE FUNDING LETTER THAT FOLLOWS IS SHORTER.' }],
  },
  {
    id: 'asylum-escape',
    when: ({ r }) => a(r).escapes >= 1,
    entries: [{ kind: 'news', text: 'A PATIENT IS MISSING FROM THE HILL. THE SHERIFF SAYS THEY ALWAYS TURN UP. THE SHERIFF SAYS IT THE WAY PEOPLE SAY THINGS THEY HOPE ARE TRUE.' }],
  },
  {
    id: 'asylum-costumes',
    act: 3,
    when: ({ r }) => r.act >= 3,
    entries: [{ kind: 'news', text: 'NATIONAL CANDY CORN DAY. EVERY STREET IN MILLBROOK IS FULL OF MASKS. THE SEARCH TEAMS STOP A HUNDRED PEOPLE IN WHITE AND LET A HUNDRED PEOPLE GO.' }],
  },
];

export const ASYLUM_ENDINGS: Readonly<Record<'sell' | 'burn', EndingText>> = {
  sell: {
    title: 'SELL GRAYHAVEN TO THE STATE',
    text: 'The state buys the hill and the records, and moves the patients somewhere with a better name. Ward Ten is the last to be emptied. Its file is sealed. Next October, the decorations go up in Millbrook as usual.',
  },
  burn: {
    title: 'BURN THE HOSPITAL ON THE HILL',
    text: 'You empty every ward and set the old infirmary alight, and Millbrook watches it burn from the street. Nobody on the hill will ever come home again. There will be no Part {nextPart}. Not here.',
  },
};
