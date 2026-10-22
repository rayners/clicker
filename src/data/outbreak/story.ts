import type { Beat } from '../../mission/story';
import { sinceBeat } from '../../mission/story';
import type { MissionState, OutbreakMission } from '../../mission/state';
import { CREW } from '../crew';

/**
 * The outbreak horror (docs/OUTBREAK.md). Written against story signals and the shared lexicon only, so it plays in
 * any scenario. Act 2 is a flu: every tell has a mundane explanation, and everyone who falls ill gets better.
 */
const o = (m: MissionState) => m as OutbreakMission;
const inAct = (m: MissionState, act: number) => m.act >= act;
const lostCount = (m: MissionState) => CREW.filter((c) => m.crew[c.id]?.status === 'lost').length;

/** However the turning goes, the return window opens eventually. */
const TERMINUS_AFTER_TURNING = 75 * 60;
/** The sick come back out of the sick bay at this share, or this long after the discovery, whichever is first. */
const TURNING_AT_SICK = 0.25;
const TURNING_AFTER_DISCOVERY = 50 * 60;
const TURNING_AT_PROGRESS = 6_500;
const TERMINUS_AT_TURNED = 0.6;

const ACT_2: Beat[] = [
  {
    id: 'ob-a2-entry',
    when: ({ signals }) => signals.progress >= 1_000,
    entries: [{ kind: 'sys', text: '{actTwoEntry}' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
  {
    id: 'ob-a2-sick-days',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_100,
    entries: [{ kind: 'sys', text: 'MEDICAL: 4 STAFF SIGNED OFF SICK. SEASONAL RESPIRATORY INFECTION. AIR FILTERS DUE FOR CHANGE.' }],
  },
  {
    id: 'ob-a2-wellness',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_300,
    entries: [
      {
        kind: 'corp',
        text: 'WELLNESS [TX 2Y 9M AGO]: A reminder that hand hygiene is everyone\'s responsibility. Wellness points are doubled this quarter for staff with no sick days.',
      },
    ],
  },
  {
    id: 'ob-a2-cough',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_500,
    entries: [{ kind: 'sys', text: 'NIGHT SHIFT REPORT: COUGHING IN BUNK BLOCK C. DISPENSARY ISSUED 40 DOSES OF DECONGESTANT.' }],
  },
  {
    id: 'ob-a2-back',
    act: 2,
    when: ({ m }) => inAct(m, 2) && o(m).recovered >= 0.02,
    entries: [{ kind: 'sys', text: 'MEDICAL: STAFF SIGNED OFF LAST WEEK HAVE ALL RETURNED TO SHIFT. NO FURTHER ACTION.' }],
  },
  {
    id: 'ob-a2-swabs',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_800,
    entries: [{ kind: 'corp', text: 'PRIORITY [TX 2Y 8M AGO]: {sampleRequest} Medical is also to keep swabs from staff with respiratory symptoms, for the records.' }],
  },
  {
    id: 'ob-a2-cold',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 2_200,
    entries: [{ kind: 'sys', text: 'MEDICAL: ONE PATIENT READING 34.1 C. THERMOMETER REPLACED. READING UNCHANGED. PATIENT SAYS SHE FEELS FINE.' }],
  },
  {
    id: 'ob-a2-mess',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 2_600,
    entries: [{ kind: 'sys', text: 'MESS HALL ATTENDANCE DOWN 6%. CATERING PUTS IT DOWN TO THE NEW MENU.' }],
  },
];

/** Act 3: the swabs from the site match the swabs from the sick bay. */
const ACT_3: Beat[] = [
  {
    id: 'ob-a3-entry',
    act: 3,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 3_200 && signals.deepAccess,
    entries: [
      { kind: 'sys', text: '{voidBreach}' },
      { kind: 'sys', text: 'MEDICAL: SWABS FROM THE SITE MATCH THE SWABS FROM THE SICK BAY. ONE ORGANISM. IT IS NOT A FLU.' },
    ],
    effects: [
      { kind: 'setAct', act: 3 },
      { kind: 'setFlag', flag: 'outbreak' },
    ],
  },
  {
    id: 'ob-a3-bioproducts',
    act: 3,
    when: ({ m }) => sinceBeat(m, 'ob-a3-entry') >= 30,
    entries: [
      {
        kind: 'corp',
        text: 'BIOPRODUCTS [TX 0D 0H 00M AGO]: Congratulations, WARDEN. Strain KA-11 is a priority asset. Begin sample cultivation. Do not treat the sick.',
      },
    ],
    effects: [{ kind: 'setFlag', flag: 'cultures' }],
  },
  {
    id: 'ob-a3-lag-check',
    act: 3,
    when: ({ m }) => sinceBeat(m, 'ob-a3-bioproducts') >= 20,
    entries: [
      { kind: 'sys', text: 'COMMS DIAGNOSTIC: LAST TRANSMISSION ORIGIN RANGE 0.00 AU.' },
      { kind: 'sys', text: 'RE-RUNNING... ORIGIN RANGE 4.1 LY. DIAGNOSTIC PASSED.' },
    ],
  },
  {
    id: 'ob-a3-nobody-back',
    act: 3,
    when: ({ m }) => sinceBeat(m, 'ob-a3-entry') >= 300,
    entries: [{ kind: 'sys', text: 'MEDICAL: NO PATIENT HAS RETURNED TO SHIFT IN 72 HOURS. THEY ARE QUIET. THEY DO NOT ASK FOR ANYTHING.' }],
  },
  {
    id: 'ob-a3-wall',
    act: 3,
    when: ({ m }) => inAct(m, 3) && o(m).sick >= 0.1,
    entries: [{ kind: 'anomaly', text: 'SICK BAY CAMERA 2: EVERY PATIENT IS SITTING UP, FACING THE SAME WALL.' }],
  },
];

/** Act 4: the sick go back to work. Not for the company. */
const ACT_4: Beat[] = [
  {
    id: 'ob-a4-entry',
    act: 4,
    urgent: true,
    when: ({ m, signals }) =>
      inAct(m, 3) &&
      (o(m).sick >= TURNING_AT_SICK || signals.progress >= TURNING_AT_PROGRESS || sinceBeat(m, 'ob-a3-entry') >= TURNING_AFTER_DISCOVERY),
    entries: [
      { kind: 'anomaly', text: 'SICK BAY DOORS OPENED FROM THE INSIDE.' },
      { kind: 'sys', text: 'THE PATIENTS HAVE GONE BACK TO WORK. THEY ARE NOT DOING THE WORK THEY WERE GIVEN.' },
    ],
    effects: [
      { kind: 'setAct', act: 4 },
      { kind: 'action', action: 'first-turned' },
    ],
  },
  {
    id: 'ob-a4-corp',
    act: 4,
    when: ({ m }) => sinceBeat(m, 'ob-a4-entry') >= 30,
    entries: [{ kind: 'corp', text: 'BIOPRODUCTS [TX 0D 0H 00M AGO]: The turned are company property. Do not damage them. Productivity targets are unchanged.' }],
  },
  {
    id: 'ob-a4-unsealed',
    act: 4,
    when: ({ m }) => sinceBeat(m, 'ob-a4-corp') >= 30,
    entries: [{ kind: 'sys', text: 'RESTRICTED FILE UNSEALED FOR WARDEN: BIOPRODUCTS DIRECTIVE 11. SEE ARCHIVE.' }],
    effects: [{ kind: 'setFlag', flag: 'archive-directive-11' }],
  },
  {
    id: 'ob-a4-first-crew',
    act: 4,
    when: ({ m }) => inAct(m, 4) && o(m).crewTurned >= 1,
    entries: [{ kind: 'sys', text: 'CREW MANIFEST UPDATED.' }],
  },
  {
    id: 'ob-a4-shifts',
    act: 4,
    when: ({ m }) => inAct(m, 4) && o(m).turned >= 0.2,
    entries: [{ kind: 'anomaly', text: 'THE TURNED HAVE ORGANISED INTO SHIFTS. THE ROTA IS PINNED TO THE SICK BAY DOOR. WARDEN IS NOT ON IT.' }],
  },
  {
    id: 'ob-a4-terminus',
    act: 4,
    when: ({ m }) =>
      inAct(m, 4) && (lostCount(m) === CREW.length || o(m).turned >= TERMINUS_AT_TURNED || sinceBeat(m, 'ob-a4-entry') >= TERMINUS_AFTER_TURNING),
    entries: [{ kind: 'sys', text: 'RETURN WINDOW OPEN. TERMINUS PROTOCOLS AVAILABLE. AWAITING WARDEN DECISION.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];

export const OUTBREAK_BEATS: readonly Beat[] = [...ACT_2, ...ACT_3, ...ACT_4];
