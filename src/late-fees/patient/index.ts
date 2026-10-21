import { PATIENT_ACTS, PATIENT_BEATS, PATIENT_ENDINGS, PATIENT_KILLS } from '../../late-fees-data/patient';
import { appendLog } from '../../shared/log';
import { interpolate } from '../../shared/lexicon';
import { nextRandom } from '../../shared/rng';
import type { KillerDef } from '../kinds';
import { actBeats } from '../story';
import type { EntryKind, Run, RunOf } from '../state';
import type { PatientFields } from './state';

/** Seconds per kill at his walking pace, before Candy Corn Day and the confrontation hurry him. */
const STALK_SECONDS = 180;
/** He presses harder with every act, and never eases off: no night to wait for, no lock that stops him. */
const PRESSURE_PER_ACT = 0.25;

const p = (r: Run) => r as RunOf<Run['venue'], 'patient'>;

export const PATIENT: KillerDef = {
  id: 'patient',
  name: 'PATIENT 10-30',
  fields: (): PatientFields => ({ killer: 'patient', stalk: 0 }),
  pressure: (r) => (1 + PRESSURE_PER_ACT * (r.act - 1)) * (1 + r.config.pressureBonus),
  tick: (r, dt, hooks) => {
    const pace = r.act >= 4 ? 2.5 : r.act >= 3 ? 1.5 : 1;
    const stalk = p(r).stalk + (dt * pace * (1 + r.config.pressureBonus)) / STALK_SECONDS;
    if (stalk < 1) return { ...r, stalk };
    let rng = r.rng;
    const roll = () => {
      const [v, next] = nextRandom(rng);
      rng = next;
      return v;
    };
    const taken = hooks.claim({ ...r, stalk: stalk - 1 }, roll);
    if (!taken) return { ...r, stalk: stalk - 1, rng };
    const line = PATIENT_KILLS[Math.floor(roll() * PATIENT_KILLS.length)]!;
    const text = interpolate(line.replace('{victim}', taken.victim), hooks.lexicon);
    return appendLog<EntryKind, Run>({ ...taken.r, rng, bodyCount: taken.r.bodyCount + 1 }, 'kill', text);
  },
  beats: [...actBeats('patient', PATIENT_ACTS), ...PATIENT_BEATS],
  endings: PATIENT_ENDINGS,
};
