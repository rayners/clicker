/**
 * A shop of one-off upgrades: what is on offer now, bought once each, and a list of what has been bought.
 * @module
 */
import { createBuyList, type Currency } from './buy-list';
import { h, setText } from './dom';

/** An upgrade as a shop sells it. */
export interface ShopUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
}

/** How a game stocks its shop. */
export interface ShopOptions<S, U extends ShopUpgrade> {
  title: string;
  /** Every upgrade, in order: the bought list follows it. */
  all: readonly U[];
  /** What is on offer now (not yet bought, and revealed). */
  available(s: S): readonly U[];
  /** The ids already bought. */
  owned(s: S): readonly string[];
  funds(s: S): number;
  currency: Currency;
  onBuy(id: string): void;
  /** The button's verb (default BUY), and the one a screen reader hears if different. */
  verb?: string;
  ariaVerb?: string;
  /** The heading over what has been bought, given how many (default BOUGHT). */
  boughtHeading?(count: number): string;
  /** A bought upgrade's line (default its name). */
  boughtLine?(u: U): string;
  /** Names its parts: the list is `<class>-list`; see `createBuyList`. */
  className?: string;
  rowClass?: string;
  titleClass?: string;
  headingClass?: string;
  /** The class of the bought list. */
  boughtClass?: string;
}

/** A shop panel; `render` keeps the offer and the bought list in step with the game. */
export function createShop<S, U extends ShopUpgrade>(options: ShopOptions<S, U>): { el: HTMLElement; render(s: S): void; hasAffordable(s: S): boolean; hasAny(s: S): boolean } {
  const list = createBuyList<S>({
    funds: options.funds,
    currency: options.currency,
    className: options.className,
    rowClass: options.rowClass,
    items: (s) =>
      options.available(s).map((u) => ({
        id: u.id,
        name: u.name,
        description: u.description,
        verb: options.verb,
        ariaVerb: options.ariaVerb,
        price: () => u.cost,
        onBuy: () => options.onBuy(u.id),
      })),
  });
  const heading = h('h3', { class: options.headingClass ?? 'panel-subtitle' });
  const bought = h('ul', { class: options.boughtClass ?? 'store-owned', 'aria-label': 'Bought' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: options.titleClass ?? 'panel-title' }, options.title), list.el, heading, bought);
  let shown = '';
  return {
    el,
    hasAffordable: list.hasAffordable,
    hasAny: (s) => options.owned(s).length > 0 || options.available(s).length > 0,
    render(s) {
      list.render(s);
      const owned = options.owned(s);
      setText(heading, options.boughtHeading ? options.boughtHeading(owned.length) : 'BOUGHT');
      const key = owned.join(',');
      if (key === shown) return;
      shown = key;
      bought.replaceChildren(...options.all.filter((u) => owned.includes(u.id)).map((u) => h('li', {}, options.boughtLine ? options.boughtLine(u) : u.name)));
    },
  };
}
