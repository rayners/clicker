import type { Beat } from '../../mission/story';
import type { MissionState, OutbreakMission, SecurityMission } from '../../mission/state';
import { held } from '../../engine/ground';

/**
 * Calder's Landing: what the outbreak means on a security contract. The colony went dark before the detachment
 * arrived; its missing colonists are the first of the turned. This pairing file is the one deliberate coupling between
 * the outbreak and a scenario, and it reads only the security scenario's public state.
 */
const s = (m: MissionState) => m as SecurityMission;
const o = (m: MissionState) => m as OutbreakMission;

/** The dormitories are the fifth sector out from the pad; the medlab the seventh. */
const DORMITORIES = 5;
const MEDLAB = 7;

export const CALDERS_LANDING_BEATS: readonly Beat[] = [
  {
    id: 'cl-dormitories',
    act: 2,
    when: ({ m }) => m.act >= 2 && s(m).deepest >= DORMITORIES,
    entries: [
      { kind: 'sys', text: 'DORMITORIES SECURED. BEDS MADE, SUITCASES PACKED BY THE DOORS. FORTY COLONISTS UNACCOUNTED FOR. EVACUATION RECORDS INCOMPLETE.' },
      { kind: 'sys', text: 'COLONY MEDICAL LOG, LAST ENTRY: "CHEST COLDS GOING ROUND THE SCHOOLHOUSE. NOTHING TO WORRY ABOUT."' },
    ],
  },
  {
    id: 'cl-medlab',
    act: 3,
    when: ({ m }) => m.act >= 3 && m.flags.includes('outbreak') && s(m).deepest >= MEDLAB,
    entries: [
      { kind: 'sys', text: 'MEDLAB: COLONY SWABS IN COLD STORAGE, LABELLED FOR BIOPRODUCTS. DATED SIX WEEKS BEFORE THE COLONY WENT DARK.' },
      { kind: 'anomaly', text: 'THE COMBINE KNEW WHAT WAS GOING ROUND CALDER\'S LANDING BEFORE IT SENT THE DETACHMENT.' },
    ],
  },
  {
    id: 'cl-name-tapes',
    act: 4,
    when: ({ m }) => m.act >= 4 && o(m).turned > 0,
    entries: [{ kind: 'anomaly', text: 'THE TURNED WEAR COLONY OVERALLS. THE NAME TAPES MATCH THE MISSING FORTY.' }],
  },
  {
    id: 'cl-tunnels',
    act: 4,
    when: ({ m }) => m.act >= 4 && held(s(m).ground) < s(m).deepest,
    entries: [{ kind: 'anomaly', text: 'SECTOR LOST. THE TURNED CAME UP THROUGH THE SERVICE TUNNELS. THEY BUILT THEM.' }],
  },
];
