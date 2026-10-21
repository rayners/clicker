import type { Beat } from '../../mission/story';
import { isCrewUnlocked } from '../../mission/crew';
import { thrust } from '../../mission/haulage/economy';
import type { HaulageMission, MissionState } from '../../mission/state';
import { DEPOTS, ROAD_LEGS } from './systems';

const s = (m: MissionState) => m as HaulageMission;
const reached = (m: MissionState, depot: string) => s(m).leg > DEPOTS.indexOf(depot);

/**
 * The overland haul is the short way in: one act, a road from the mine to the space elevator, and a promotion at
 * the end. Nothing goes wrong. One container is a little too cold, and nobody asks why.
 */
export const OVERLAND_BEATS: readonly Beat[] = [
  {
    id: 'land-welcome',
    when: ({ m }) => m.lifetimeCredits >= 10,
    entries: [
      {
        kind: 'corp',
        text: 'MEMO [TX 0Y 0M 4D AGO]: Drive the ore from Pit 4 to Port Kessler Lift. Deliveries inside the window earn a bonus. Do this well and there is a bigger contract waiting at the top.',
      },
    ],
  },
  {
    id: 'land-first-engine',
    when: ({ m }) => thrust(s(m)) > 0,
    entries: [{ kind: 'crew', text: 'CHIEF ENGINEER SORENSEN: She runs. Keep her off the red line with a load on, WARDEN, or the trailers dance.' }],
  },
  {
    id: 'land-cryo-access',
    when: ({ m }) => isCrewUnlocked(m),
    entries: [{ kind: 'sys', text: 'SLEEPER CAB ROTATION AUTHORISED. LIFE SUPPORT RATED FOR 3 WAKING CREW.' }],
  },
  {
    id: 'land-salt-flats',
    when: ({ m }) => reached(m, 'SALT FLATS WATER STOP'),
    entries: [{ kind: 'crew', text: 'DECKHAND OSEI: Salt flats. Flattest road on the planet, and every driver in the canteen says don\'t stop on it.' }],
  },
  {
    id: 'land-cold-container',
    when: ({ m }) => reached(m, 'GANTRY JUNCTION'),
    entries: [
      { kind: 'sys', text: 'CONTAINER KS-11 COUPLED UNDER CUSTOMS SEAL. CONTENTS NOT DECLARED. SURFACE TEMPERATURE 4 K BELOW AMBIENT. LOGGED AS: REFRIGERATED FREIGHT.' },
    ],
  },
  {
    id: 'land-outer-marker',
    when: ({ m }) => reached(m, 'OUTER MARKER'),
    entries: [{ kind: 'corp', text: 'MEMO [TX 0Y 0M 1D AGO]: The long-haul board has reviewed WARDEN\'s delivery record. Please proceed to the lift.' }],
  },
  {
    id: 'land-terminus',
    urgent: true,
    when: ({ m }) => s(m).leg >= ROAD_LEGS,
    entries: [
      { kind: 'sys', text: 'PORT KESSLER LIFT. FREIGHT HANDED ON TO THE ELEVATOR. ROAD CONTRACT COMPLETE.' },
      { kind: 'corp', text: 'MEMO: The Combine is pleased to offer WARDEN a long-haul contract. A tug is waiting at the top of the lift. See TERMINUS.' },
    ],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];
