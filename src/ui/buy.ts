import { formatNumber } from '../engine/format';
import type { BuyItem, Currency } from '../engine/ui/buy-list';

/** Combine scrip: `123 CR` on a button, "123 credits" aloud. */
export const CREDITS: Currency = { text: (n) => `${formatNumber(n)} CR`, spoken: (n) => `${formatNumber(n)} credits` };

/** What one more would add, or why it would add nothing. */
export interface Adds {
  text: string;
  wasted: boolean;
}

/** Income one more would add, or why none. */
export const addsIncome = (gain: number, why: string): Adds => (gain > 0 ? { text: `+${formatNumber(gain)} CR/S`, wasted: false } : { text: `+0 CR/S · ${why}`, wasted: true });

/** A contract's unit for sale: how many are owned, what each does, and what one more would add where it matters. */
export function unitItem<M>(
  def: { id: string; name: string; description: string },
  spec: { verb: string; owned(m: M): number; price(m: M): number; each(m: M): string; adds(m: M): Adds; addsAria?: string; shown?(m: M): boolean; onBuy(): void },
): BuyItem<M> {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    verb: spec.verb.toUpperCase(),
    owned: (m) => String(spec.owned(m)),
    ownedAria: `${def.name} owned`,
    notes: [
      { read: spec.each },
      { aria: spec.addsAria ?? `${def.name} gain`, className: 'sys-gain', read: (m) => spec.adds(m).text, wasted: (m) => spec.adds(m).wasted },
    ],
    price: spec.price,
    shown: spec.shown,
    onBuy: spec.onBuy,
  };
}
