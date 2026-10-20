import { DROWNED_ACTS, DROWNED_BEATS, DROWNED_ENDINGS, DROWNED_KILLS } from '../../late-fees-data/drowned';
import { appendLog } from '../../shared/log';
import { interpolate } from '../../shared/lexicon';
import { nextRandom } from '../../shared/rng';
import type { KillerDef } from '../kinds';
import { actBeats } from '../story';
import type { EntryKind, Run, RunOf } from '../state';
import type { DrownedFields } from './state';

/** Seconds of night per person he takes, before the final girl and the confrontation hurry him. */
const STALK_SECONDS = 120;
const NIGHT_PRESSURE = 3;
const CONFRONTATION_PRESSURE = 2;

const d = (r: Run) => r as RunOf<Run['venue'], 'drowned'>;

export const DROWNED: KillerDef = {
  id: 'drowned',
  name: 'THE DROWNED BOY',
  fields: (): DrownedFields => ({ killer: 'drowned', stalk: 0 }),
  pressure: (r, signals) => (signals.night ? NIGHT_PRESSURE : 1) * (r.act >= 4 ? CONFRONTATION_PRESSURE : 1) * (1 + r.config.pressureBonus),
  tick: (r, dt, hooks, signals) => {
    if (!signals.night) return r;
    const pace = r.act >= 4 ? 3 : r.act >= 3 ? 1.5 : 1;
    const stalk = d(r).stalk + (dt * pace * (1 + r.config.pressureBonus)) / STALK_SECONDS;
    if (stalk < 1) return { ...r, stalk };
    let rng = r.rng;
    const roll = () => {
      const [v, next] = nextRandom(rng);
      rng = next;
      return v;
    };
    const taken = hooks.claim({ ...r, stalk: stalk - 1 }, roll);
    if (!taken) return { ...r, stalk: stalk - 1, rng };
    const line = DROWNED_KILLS[Math.floor(roll() * DROWNED_KILLS.length)]!;
    const text = interpolate(line.replace('{victim}', taken.victim), hooks.lexicon);
    const next = { ...taken.r, rng, bodyCount: taken.r.bodyCount + 1 };
    return appendLog<EntryKind, Run>(next, 'kill', text);
  },
  beats: [...actBeats('drowned', DROWNED_ACTS), ...DROWNED_BEATS],
  endings: DROWNED_ENDINGS,
};
