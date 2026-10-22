import { CREW } from '../../data/crew';
import { HUNTER_ACTS, HUNTER_BEATS } from '../../data/hunter/story';
import { nextRandom } from '../../shared/rng';
import type { HorrorDef } from '../kinds';
import { appendLog } from '../log';
import type { HunterMission, MissionState } from '../state';
import type { HunterFields } from './state';

/** Seconds per glimpse or kill at one unit of push. */
const STALK_SECONDS = 90;
/** Trophy value of an officer on watch; equipment counts one. */
const CREW_TROPHY = 3;
/** Alert that fades per second: one sighting forgotten every two minutes. */
const ALERT_FADE = 1 / 120;
/** The crew is armed and looking from here: below it the hunter only lets itself be seen. */
export const HUNTER_ARMED_AT = HUNTER_ACTS.armed;
export const HUNTER_DRIVEN_AT = HUNTER_ACTS.driven;

const h = (m: MissionState) => m as HunterMission;

const GLIMPSE_LINES = [
  'A SHAPE IN THE AIR OVER THE CARGO BAY, BENDING THE LIGHT. GONE WHEN THE LAMPS COME UP.',
  'THREE RED POINTS ON A BULKHEAD, THEN NONE.',
  'THE CREW HEAR THEIR OWN VOICES REPEATED BACK FROM THE DUCTS.',
];

const TROPHY_LINES = [
  (name: string) => `${name} TAKEN FROM THE DECK. THE WEAPON IS LEFT BEHIND, NEATLY.`,
  (name: string) => `${name} FOUND IN THE CARGO BAY. THE BODY HAS BEEN TAKEN APART WITH CARE.`,
];

const EQUIPMENT_LINES = [(name: string) => `${name} CUT DOWN AND STRIPPED FOR PARTS. A CLEAN CUT, LIKE A BLADE.`];

export const HUNTER: HorrorDef = {
  id: 'hunter',
  fields: (): HunterFields => ({ horror: 'hunter', push: 0, stalk: 0, trophies: 0, alert: 0 }),
  tick: (m, dt, hooks) => {
    const mission = h(m);
    const alert = Math.max(0, mission.alert - ALERT_FADE * dt);
    if (mission.push <= 0) return alert === mission.alert ? m : ({ ...m, alert } as MissionState);
    let stalk = mission.stalk + (dt * mission.push) / STALK_SECONDS;
    let next = { ...m, alert } as MissionState;
    let rng = m.rng;
    const roll = () => {
      const [v, s] = nextRandom(rng);
      rng = s;
      return v;
    };
    while (stalk >= 1) {
      stalk -= 1;
      // The code: nothing is taken from a crew that has not seen it coming.
      if (h(next).alert < HUNTER_ARMED_AT) {
        next = appendLog({ ...next, alert: h(next).alert + 1 } as MissionState, 'anomaly', GLIMPSE_LINES[Math.floor(roll() * GLIMPSE_LINES.length)]!);
        continue;
      }
      // Officers on watch first; it never takes a sleeper from cryo.
      const watch = CREW.filter((x) => next.crew[x.id]?.status === 'awake');
      let worth = 1;
      if (watch.length > 0) {
        const victim = watch[Math.floor(roll() * watch.length)]!;
        next = { ...next, crew: { ...next.crew, [victim.id]: { ...next.crew[victim.id]!, status: 'lost' } } };
        next = appendLog(next, 'anomaly', TROPHY_LINES[Math.floor(roll() * TROPHY_LINES.length)]!(victim.callsign));
        worth = CREW_TROPHY;
      } else {
        const lost = hooks.loseEquipment(next, roll);
        if (!lost) continue;
        next = appendLog(lost.m, 'anomaly', EQUIPMENT_LINES[Math.floor(roll() * EQUIPMENT_LINES.length)]!(lost.name));
      }
      next = { ...next, trophies: h(next).trophies + worth, alert: h(next).alert + 1 } as MissionState;
    }
    return { ...next, stalk, rng } as MissionState;
  },
  beats: HUNTER_BEATS,
  pairings: {},
  archive: [],
  endings: {},
  productionMultiplier: () => 1,
  pressure: (m) => 1 + h(m).push,
  applyEffect: (m) => m,
};
