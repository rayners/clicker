import type { Beat } from '../../mission/story';
import type { CreatureMission, MissionState } from '../../mission/state';

const c = (m: MissionState) => m as CreatureMission;

/** Suspicion at each turn of WARDEN's thinking; the last one vents every deck. */
export const CREATURE_ACTS = { noticed: 10, hunted: 20, vented: 30 };

/** WARDEN, slowly working out that something aboard is not on the manifest. No scenario words needed. */
export const CREATURE_BEATS: readonly Beat[] = [
  {
    id: 'creature-first',
    when: ({ m }) => c(m).taken >= 1,
    entries: [{ kind: 'sys', text: 'EQUIPMENT LOSS LOGGED. CAUSE: UNDETERMINED. MAINTENANCE TICKET RAISED.' }],
  },
  {
    id: 'creature-noticed',
    act: 2,
    when: ({ m }) => c(m).suspicion >= CREATURE_ACTS.noticed,
    entries: [{ kind: 'anomaly', text: 'WARDEN: LOSS RATE EXCEEDS ANY MECHANICAL MODEL. SOMETHING ABOARD IS NOT ON THE MANIFEST.' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
  {
    id: 'creature-hunted',
    act: 3,
    urgent: true,
    when: ({ m }) => c(m).suspicion >= CREATURE_ACTS.hunted,
    entries: [{ kind: 'anomaly', text: 'WARDEN: MOTION TRACKING ENABLED SHIPWIDE. HEAT SIGNATURE IN THE VENTS. IT IS LEARNING THE SHIP.' }],
    effects: [
      { kind: 'setAct', act: 3 },
      { kind: 'setFlag', flag: 'tracker' },
    ],
  },
  {
    id: 'creature-vented',
    act: 4,
    urgent: true,
    when: ({ m }) => c(m).suspicion >= CREATURE_ACTS.vented,
    entries: [{ kind: 'anomaly', text: 'WARDEN: SEALING ALL DECKS. VENTING TO VACUUM ON MY AUTHORITY. NOTHING ABOARD SURVIVES THIS. NOTHING SHOULD.' }],
    effects: [
      { kind: 'setAct', act: 4 },
      { kind: 'setFlag', flag: 'terminus' },
    ],
  },
];
