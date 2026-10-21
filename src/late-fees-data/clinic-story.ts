import type { Lexicon } from '../shared/lexicon';
import type { RunBeat } from '../late-fees/kinds';
import { patients } from '../late-fees/clinic/economy';
import type { ClinicRun, Run } from '../late-fees/state';

const c = (r: Run) => r as ClinicRun;

/** How the clinic names things, for killer text written once for every venue. */
export const CLINIC_LEXICON: Lexicon = {
  place: 'THE SYCAMORE STREET CLINIC',
  victims: 'PATIENTS',
  staff: 'NIGHT STAFF',
  refuge: 'OBSERVATION ROOM',
  deepPlace: 'THE BASEMENT WARD',
  finalGirl: 'NELL',
};

/** The business side: the grant, the study, the town. */
export const CLINIC_BEATS: readonly RunBeat[] = [
  {
    id: 'clinic-grant',
    when: ({ r }) => r.lifetimeCash >= 20,
    entries: [{ kind: 'news', text: 'LETTER FROM THE GRANT-HOLDER: "We are paying for dreams, Administrator. Deep ones. Please do not let the patients wake up early."' }],
  },
  {
    id: 'clinic-first-patient',
    when: ({ r }) => patients(c(r)) > 0,
    entries: [{ kind: 'staff', text: 'THE FIRST VOLUNTEERS ARE TEENAGERS FROM THE STREET. ALL OF THEM HAVE BEEN HAVING THE SAME DREAM. NONE OF THEM WILL SAY WHAT ABOUT.' }],
  },
  {
    id: 'clinic-house',
    when: ({ r }) => patients(c(r)) >= 10,
    entries: [{ kind: 'staff', text: 'THE CLINIC USED TO BE A HOUSE. A NEIGHBOUR SAYS THE PARENTS ON THIS STREET DID SOMETHING, YEARS AGO, AND NEVER TALKED ABOUT IT.' }],
  },
  {
    id: 'clinic-insurance',
    when: ({ r }) => r.lifetimeCash >= 5_000,
    entries: [{ kind: 'news', text: 'THE ETHICS BOARD ASKS ABOUT THE DEATHS. THE GRANT-HOLDER ASKS ABOUT THE DATA. THE GRANT-HOLDER PAYS.' }],
  },
  {
    id: 'clinic-reputation',
    when: ({ r }) => r.reputation < 0.6,
    entries: [{ kind: 'news', text: 'THE LOCAL PAPER CALLS IT "THE SLEEP OF DEATH STUDY". VOLUNTEERS KEEP COMING. THEY SAY THE CLINIC IS THE ONLY PLACE ANYONE IS WATCHING THEM.' }],
  },
];
