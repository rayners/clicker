import { levyRate } from './breach';
import { researchRate } from './open-water';
import { autoPassRate, incomeRate, passPrice } from './shallows';
import { boats, catchRate } from './shelf';
import { sampleRate } from './trench';
import type { Outfit } from './state';

/** Money coming in per second, from every open zone. */
export function incomeNow(o: Outfit): number {
  return (
    incomeRate(o) +
    autoPassRate(o) * passPrice(o) +
    (boats(o) > 0 ? catchRate(o) : 0) +
    researchRate(o) +
    (o.modules > 0 ? sampleRate(o) : 0) +
    levyRate(o)
  );
}
