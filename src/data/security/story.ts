import type { Beat } from '../../mission/story';
import { isCrewUnlocked } from '../../mission/crew';
import { force, progress } from '../../mission/security/economy';
import type { MissionState, SecurityMission } from '../../mission/state';
import { SECTIONS } from './systems';

const s = (m: MissionState) => m as SecurityMission;
const reached = (m: MissionState, id: string) => s(m).deepest > SECTIONS.findIndex((x) => x.id === id);

/**
 * Act 1 for a security contract: pest control and paperwork. Act 2 flavour is the colony itself, and every
 * tell has a dull explanation (an evacuation drill, a burst main, a supply problem).
 */
export const SECURITY_BEATS: readonly Beat[] = [
  {
    id: 'sec-welcome',
    when: ({ m }) => m.lifetimeCredits >= 20,
    entries: [
      {
        kind: 'corp',
        text: 'MEMO [TX 4Y 2M AGO]: Calder\'s Landing is experiencing a communications outage. Restore company control of all colony property. Overtime is pre-approved.',
      },
    ],
  },
  {
    id: 'sec-first-trooper',
    when: ({ m }) => force(s(m)) > 0,
    entries: [{ kind: 'crew', text: 'SGT. ABARA-QUINN: Squad\'s on the pad, WARDEN. Feels like a lot of guns for a dead radio mast.' }],
  },
  {
    id: 'sec-ops',
    when: ({ m }) => reached(m, 'ops'),
    entries: [
      { kind: 'sys', text: 'OPERATIONS BLOCK SECURED. COLONY LOGS END 19 DAYS AGO. LAST ENTRY: "MAINTENANCE CREW TO SUB-LEVEL 2, RE: NOISE".' },
    ],
  },
  {
    id: 'sec-cryo-access',
    when: ({ m }) => isCrewUnlocked(m),
    entries: [{ kind: 'sys', text: 'SHIP CREW BAY ACCESS AUTHORISED. THAW PROTOCOLS AVAILABLE. LIFE SUPPORT RATED FOR 3 WAKING CREW.' }],
  },
  {
    id: 'sec-hydro',
    when: ({ m }) => reached(m, 'hydro'),
    entries: [{ kind: 'crew', text: 'PVT. DOYLE: Goats got loose in hydroponics. Fat goats. Somebody\'s been feeding them, or nobody has.' }],
  },
  {
    id: 'sec-insurers',
    when: ({ m }) => s(m).recovered >= 5_000,
    entries: [
      { kind: 'corp', text: 'INSURANCE LIAISON [TX 4Y AGO]: Please photograph all recovered equipment before use. Colony fixtures remain the property of Kessler-Amari.' },
    ],
  },
  {
    id: 'sec-mess',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'mess'),
    entries: [
      { kind: 'sys', text: 'MESS HALL INVENTORY COMPLETE. MEALS LEFT ON THE TABLES, HALF EATEN. LOGGED AS: EVACUATION DRILL, NOT STOOD DOWN.' },
    ],
  },
  {
    id: 'sec-dorms',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'dorms'),
    entries: [
      { kind: 'crew', text: 'CPL. VASQUEZ-ORR: Barricades in the dorms, WARDEN. Welded. From the inside. Looters, maybe. Looters who left.' },
    ],
  },
  {
    id: 'sec-school',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'school'),
    entries: [
      { kind: 'sys', text: 'SCHOOLHOUSE INVENTORY COMPLETE. A DRAWING TAPED TO THE HATCH: THE COLONY, AND UNDER IT, A LOT OF BLACK CRAYON. FILED.' },
    ],
  },
  {
    id: 'sec-medlab',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'medlab'),
    entries: [
      { kind: 'sys', text: 'MEDLAB INVENTORY COMPLETE. SPECIMEN TANKS 1-6 DRAINED. TANK 7 CRACKED OUTWARD. CAUSE: THERMAL STRESS (COOLANT FAILURE).' },
    ],
  },
  {
    id: 'sec-progress-2000',
    act: 2,
    when: ({ m }) => m.act >= 2 && progress(s(m)) >= 2_000,
    entries: [
      { kind: 'corp', text: 'MEMO [TX 3Y 11M AGO]: Do not enter the processor sub-levels without a Special Projects observer present. An observer has been dispatched.' },
    ],
  },
];
