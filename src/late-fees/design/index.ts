import { DESIGN_ACTS, DESIGN_BEATS, DESIGN_ENDINGS, DESIGN_KILLS } from '../../late-fees-data/design';
import { appendLog } from '../../engine/log';
import { interpolate } from '../../engine/lexicon';
import { nextRandom } from '../../engine/rng';
import type { KillerDef } from '../kinds';
import { actBeats } from '../story';
import type { EntryKind, Run, RunOf } from '../state';
import type { DesignFields } from './state';

/** Seconds between accidents away from the list; the list itself is the venue's to defend. */
const STALK_SECONDS = 900;
const CONFRONTATION_PRESSURE = 2;

const d = (r: Run) => r as RunOf<Run['venue'], 'design'>;

export const DESIGN: KillerDef = {
  id: 'design',
  name: "DEATH'S DESIGN",
  fields: (): DesignFields => ({ killer: 'design', stalk: 0 }),
  // Death keeps no hours: day or night, the design runs; it only quickens at the end.
  pressure: (r) => (r.act >= 4 ? CONFRONTATION_PRESSURE : 1) * (1 + r.config.pressureBonus),
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
    const line = DESIGN_KILLS[Math.floor(roll() * DESIGN_KILLS.length)]!;
    return appendLog<EntryKind, Run>({ ...taken.r, rng, bodyCount: taken.r.bodyCount + 1 }, 'kill', interpolate(line.replace('{victim}', taken.victim), hooks.lexicon));
  },
  beats: [...actBeats('design', DESIGN_ACTS), ...DESIGN_BEATS],
  endings: DESIGN_ENDINGS,
};
