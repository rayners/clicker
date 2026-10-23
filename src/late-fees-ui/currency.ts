import { formatNumber } from '../engine/format';
import type { BuyItem, Currency } from '../engine/ui/buy-list';

/** Dollars, on a button and aloud. */
export const DOLLARS: Currency = { text: (n) => `$${formatNumber(n)}`, spoken: (n) => `$${formatNumber(n)}` };

/** How the VHS shelf's buy lists are laid out. */
export const LISTS = { currency: DOLLARS, className: 'item', rowClass: 'item', headingClass: 'panel-sub' } as const;

/** Something a venue sells by the unit: how many are owned, what each does, and its price. */
export function unit<R>(
  def: { id: string; name: string; description: string },
  spec: { verb: string; owned(r: R): number; price(r: R): number; each(r: R): string; shown?(r: R): boolean; onBuy(): void },
): BuyItem<R> {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    verb: spec.verb.toUpperCase(),
    owned: (r) => String(spec.owned(r)),
    ownedAria: `${def.name} owned`,
    notes: [{ read: spec.each }],
    price: spec.price,
    shown: spec.shown,
    onBuy: spec.onBuy,
  };
}
