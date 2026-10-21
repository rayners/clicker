import { BURNED_ACTS, BURNED_BEATS, BURNED_ENDINGS, BURNED_KILLS } from '../../late-fees-data/burned';
import { appendLog } from '../../shared/log';
import { interpolate } from '../../shared/lexicon';
import { nextRandom } from '../../shared/rng';
import type { KillerDef } from '../kinds';
import { actBeats } from '../story';
import type { EntryKind, Run, RunOf } from '../state';
import type { BurnedFields } from './state';

/** Seconds of sleep per signature kill, before the final girl and the confrontation hurry him. */
const STALK_SECONDS = 150;
const CONFRONTATION_PRESSURE = 2;

const b = (r: Run) => r as RunOf<Run['venue'], 'burned'>;

export const BURNED: KillerDef = {
  id: 'burned',
  name: 'THE BURNED MAN',
  fields: (): BurnedFields => ({ killer: 'burned', stalk: 0 }),
  pressure: (r, signals) => (signals.night ? 1 : 0.2) * (r.act >= 4 ? CONFRONTATION_PRESSURE : 1) * (1 + r.config.pressureBonus),
  tick: (r, dt, hooks, signals) => {
    if (!signals.night) return r;
    const pace = r.act >= 4 ? 3 : r.act >= 3 ? 1.5 : 1;
    const stalk = b(r).stalk + (dt * pace * (1 + r.config.pressureBonus)) / STALK_SECONDS;
    if (stalk < 1) return { ...r, stalk };
    let rng = r.rng;
    const roll = () => {
      const [v, next] = nextRandom(rng);
      rng = next;
      return v;
    };
    const taken = hooks.claim({ ...r, stalk: stalk - 1 }, roll);
    if (!taken) return { ...r, stalk: stalk - 1, rng };
    const line = BURNED_KILLS[Math.floor(roll() * BURNED_KILLS.length)]!;
    const text = interpolate(line.replace('{victim}', taken.victim), hooks.lexicon);
    return appendLog<EntryKind, Run>({ ...taken.r, rng, bodyCount: taken.r.bodyCount + 1 }, 'kill', text);
  },
  beats: [...actBeats('burned', BURNED_ACTS), ...BURNED_BEATS],
  endings: BURNED_ENDINGS,
};
