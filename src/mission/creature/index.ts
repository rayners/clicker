import { CREW } from '../../data/crew';
import { CREATURE_ACTS, CREATURE_BEATS } from '../../data/creature/story';
import { nextRandom } from '../../engine/rng';
import { crewStatus } from '../crew';
import type { HorrorDef } from '../kinds';
import { appendLog } from '../log';
import type { CreatureMission, MissionState } from '../state';
import type { CreatureFields } from './state';

/** Seconds per taking at one unit of push. */
const STALK_SECONDS = 90;
/** Share of takings that are crew rather than equipment, when there is crew to take. */
const CREW_SHARE = 0.25;
/** Suspicion that fades per second: one taking forgotten every two minutes. */
const SUSPICION_FADE = 1 / 120;
export const CREATURE_ALARM_AT = CREATURE_ACTS.vented;

const c = (m: MissionState) => m as CreatureMission;

const EQUIPMENT_LINES = [
  (name: string) => `${name} SIGNAL LOST. LAST TELEMETRY: [CORRUPTED].`,
  (name: string) => `${name} OFFLINE. CAMERA FEED SHOWS MOVEMENT. CAMERA FEED LOST.`,
  (name: string) => `${name}: HULL BREACH FROM INSIDE. UNIT UNRESPONSIVE.`,
];

const CREW_LINES = [
  (name: string) => `BIOMONITOR: ${name}, NO SIGNAL.`,
  (name: string) => `${name} WENT TO CHECK A NOISE IN THE VENTS.`,
  (name: string) => `CRYO POD OPENED FROM OUTSIDE. ${name} NOT IN POD.`,
];

export const CREATURE: HorrorDef = {
  id: 'creature',
  fields: (): CreatureFields => ({ horror: 'creature', push: 0, stalk: 0, taken: 0, suspicion: 0 }),
  tick: (m, dt, hooks) => {
    const mission = c(m);
    const suspicion = Math.max(0, mission.suspicion - SUSPICION_FADE * dt);
    if (mission.push <= 0) return suspicion === mission.suspicion ? m : ({ ...m, suspicion } as MissionState);
    let stalk = mission.stalk + (dt * mission.push) / STALK_SECONDS;
    let next = { ...m, suspicion } as MissionState;
    let rng = m.rng;
    const roll = () => {
      const [v, s] = nextRandom(rng);
      rng = s;
      return v;
    };
    while (stalk >= 1) {
      stalk -= 1;
      const living = CREW.filter((x) => crewStatus(next, x.id) !== 'lost');
      if (living.length > 0 && roll() < CREW_SHARE) {
        const victim = living[Math.floor(roll() * living.length)]!;
        next = { ...next, crew: { ...next.crew, [victim.id]: { ...next.crew[victim.id]!, status: 'lost' } } };
        next = appendLog(next, 'anomaly', CREW_LINES[Math.floor(roll() * CREW_LINES.length)]!(victim.callsign));
      } else {
        const lost = hooks.loseEquipment(next, roll);
        if (!lost) continue;
        next = appendLog(lost.m, 'anomaly', EQUIPMENT_LINES[Math.floor(roll() * EQUIPMENT_LINES.length)]!(lost.name));
      }
      next = { ...next, taken: c(next).taken + 1, suspicion: c(next).suspicion + 1 } as MissionState;
    }
    return { ...next, stalk, rng } as MissionState;
  },
  beats: CREATURE_BEATS,
  pairings: {},
  archive: [],
  endings: {},
  productionMultiplier: () => 1,
  pressure: (m) => 1 + c(m).push,
  applyEffect: (m) => m,
};
