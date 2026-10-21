import { ASYLUM_STAFF, PATIENT_NAMES_ASYLUM, TOWN_NAMES, WARDS } from '../../late-fees-data/asylum';
import { ASYLUM_BEATS, ASYLUM_ENDINGS, ASYLUM_LEXICON } from '../../late-fees-data/asylum-story';
import type { VenueDef } from '../kinds';
import type { AsylumRun, Run, RunConfig } from '../state';
import { asylumSignals, DEFAULT_SEDATION, patients, tickAsylum } from './economy';
import type { AsylumFields } from './state';

const a = (r: Run) => r as AsylumRun;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

export const ASYLUM: VenueDef = {
  id: 'asylum',
  fields: (): AsylumFields => ({
    venue: 'asylum',
    wards: zeroes(WARDS),
    staff: zeroes(ASYLUM_STAFF),
    sedation: DEFAULT_SEDATION,
    agitation: 0,
    rating: 1,
    doors: 0,
    doorWear: 0,
    loose: 0,
    searching: 0,
    escapes: 0,
    dialOff: false,
  }),
  boot: (config: RunConfig) => [
    'PLAY ▶',
    config.title,
    'GRAYHAVEN STATE HOSPITAL. A COUNTY ASYLUM ON THE HILL ABOVE MILLBROOK, AND A BUDGET THAT PAYS BY THE BED.',
    'TWENTY-NINE DAYS TO NATIONAL CANDY CORN DAY. WARD TEN HAS ONE PATIENT. HE HAS NOT SPOKEN IN FIFTEEN YEARS.',
  ],
  tick: (r, dt) => tickAsylum(a(r), dt),
  signals: (r) => asylumSignals(a(r)),
  lexicon: ASYLUM_LEXICON,
  beats: ASYLUM_BEATS,
  endings: ASYLUM_ENDINGS,
  // On Candy Corn Day the town below is full of people in masks, and some of them never get home.
  claim: (r, roll) => {
    if (patients(a(r)) === 0) return null;
    if (r.act >= 3 && roll() < 0.5) return { r, victim: TOWN_NAMES[Math.floor(roll() * TOWN_NAMES.length)]! };
    return { r, victim: `PATIENT ${PATIENT_NAMES_ASYLUM[Math.floor(roll() * PATIENT_NAMES_ASYLUM.length)]!}` };
  },
  outcome: (r) => ({ output: patients(a(r)), unit: 'BEDS' }),
  stakes: (r) => {
    const h = a(r);
    return `GRAYHAVEN: ${patients(h).toLocaleString('en-US')} PATIENTS ON THE HILL, ${h.loose.toLocaleString('en-US')} STILL LOOSE IN MILLBROOK. ${h.bodyCount.toLocaleString('en-US')} WILL NOT BE COMING HOME.`;
  },
};
