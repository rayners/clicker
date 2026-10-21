import type { Beat } from '../../mission/story';
import { isCrewUnlocked } from '../../mission/crew';
import { progress, thrust } from '../../mission/haulage/economy';
import type { HaulageMission, MissionState } from '../../mission/state';
import { CARS } from './systems';

const s = (m: MissionState) => m as HaulageMission;
const cars = (m: MissionState) => CARS.reduce((n, c) => n + (s(m).cars[c.id] ?? 0), 0);

/**
 * Act 1 for a haulage contract: union grumbling and the share schedule. Nobody is here to fight anything. Act 2
 * flavour is the freight itself, and every tell has a dull explanation (a scale fault, a coolant leak, customs).
 */
export const HAULAGE_BEATS: readonly Beat[] = [
  {
    id: 'haul-welcome',
    when: ({ m }) => m.lifetimeCredits >= 10,
    entries: [
      {
        kind: 'corp',
        text: 'MEMO [TX 2Y 6M AGO]: Bring the refinery train home along the contracted route. Deliveries inside the window earn a bonus. Lateness is noted on the crew\'s record.',
      },
    ],
  },
  {
    id: 'haul-first-engine',
    when: ({ m }) => thrust(s(m)) > 0,
    entries: [{ kind: 'crew', text: 'CHIEF ENGINEER SORENSEN: Engines lit. Don\'t open the throttle past six with cars on, WARDEN. The couplings remember.' }],
  },
  {
    id: 'haul-union',
    when: ({ m }) => cars(m) >= 3,
    entries: [
      { kind: 'crew', text: 'UNION REP ADEYEMI-HOLT: Three cars on a tug rated for two. The membership would like that written down somewhere.' },
    ],
  },
  {
    id: 'haul-cryo-access',
    when: ({ m }) => isCrewUnlocked(m),
    entries: [{ kind: 'sys', text: 'CRYO WATCH ROTATION AUTHORISED. THAW PROTOCOLS AVAILABLE. LIFE SUPPORT RATED FOR 3 WAKING CREW.' }],
  },
  {
    id: 'haul-shares',
    when: ({ m }) => s(m).delivered >= 2_000,
    entries: [
      { kind: 'corp', text: 'MEMO [TX 2Y 5M AGO]: The share schedule has been revised in light of current market conditions. The revision is attached. The attachment is forty pages long.' },
    ],
  },
  {
    id: 'haul-container',
    when: ({ m }) => s(m).leg >= 3,
    entries: [
      { kind: 'sys', text: 'CONTAINER KA-77 COUPLED AT HALCYON FUEL DOCK UNDER CUSTOMS BOND. CONTENTS: NOT DECLARED. WEIGHING: WAIVED BY ORDER.' },
    ],
  },
  {
    id: 'haul-mass',
    act: 2,
    when: ({ m }) => m.act >= 2 && s(m).leg >= 5,
    entries: [{ kind: 'sys', text: 'MANIFEST MASS +0.8 KG SINCE LAST LEG. LOGGED AS: SCALE DRIFT. LOAD CELLS RECALIBRATED.' }],
  },
  {
    id: 'haul-frost',
    act: 2,
    when: ({ m }) => m.act >= 2 && s(m).leg >= 6,
    entries: [
      { kind: 'crew', text: 'DECKHAND OSEI: Frost on the inside of car 3\'s hatch. Inside. Coolant leak, probably. I\'m not going in to check without a second pair.' },
    ],
  },
  {
    id: 'haul-beacon-order',
    act: 2,
    when: ({ m }) => m.act >= 2 && s(m).leg >= 7,
    entries: [
      { kind: 'corp', text: 'MEMO [TX 2Y 2M AGO]: Your contract obliges you to answer distress beacons on the route. A beacon has been added to your route. You will answer it.' },
    ],
  },
  {
    id: 'haul-progress-2000',
    act: 2,
    when: ({ m }) => m.act >= 2 && progress(s(m)) >= 2_000,
    entries: [
      { kind: 'crew', text: 'UNION REP ADEYEMI-HOLT: The membership notes the beacon detour comes off our window bonus. The membership would like to know who added it.' },
    ],
  },
];
