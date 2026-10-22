import type { Beat } from '../../mission/story';
import type { HunterMission, MissionState } from '../../mission/state';

const h = (m: MissionState) => m as HunterMission;

/** Alert at each turn of the crew's thinking; the last drives the hunter off. */
export const HUNTER_ACTS = { armed: 5, hunting: 15, driven: 25 };

/** A crew working out that something on the hull is choosing them. No scenario words needed. */
export const HUNTER_BEATS: readonly Beat[] = [
  {
    id: 'hunter-first',
    when: ({ m }) => h(m).alert >= 1,
    entries: [{ kind: 'sys', text: 'EXTERNAL CAMERA 4: IMAGE DISTORTION ON THE HULL. LOGGED AS: LENS FAULT.' }],
  },
  {
    id: 'hunter-armed',
    act: 2,
    when: ({ m }) => h(m).alert >= HUNTER_ACTS.armed,
    entries: [{ kind: 'anomaly', text: 'WARDEN: THE CREW HAVE DRAWN WEAPONS FROM THE LOCKER. THEY SAY SOMETHING WATCHES THEM FROM THE DUCTS. THEY SAY IT LETS ITSELF BE SEEN.' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
  {
    id: 'hunter-hunting',
    act: 3,
    urgent: true,
    when: ({ m }) => h(m).alert >= HUNTER_ACTS.hunting,
    entries: [{ kind: 'anomaly', text: 'WARDEN: THE TAKEN ARE FOUND HUNG IN THE CARGO BAY. ONLY THE ONES WHO WERE ARMED. THE SLEEPERS IN CRYO ARE UNTOUCHED.' }],
    effects: [
      { kind: 'setAct', act: 3 },
      { kind: 'setFlag', flag: 'tracker' },
    ],
  },
  {
    id: 'hunter-driven',
    act: 4,
    urgent: true,
    when: ({ m }) => h(m).alert >= HUNTER_ACTS.driven,
    entries: [{ kind: 'anomaly', text: 'WARDEN: THE CREW CORNER IT IN THE AIRLOCK AND BLOW THE DOOR. A SHAPE IN THE DARK, THEN NOTHING. SOMEWHERE, A SHIP ANSWERS IT.' }],
    effects: [
      { kind: 'setAct', act: 4 },
      { kind: 'setFlag', flag: 'terminus' },
    ],
  },
];
