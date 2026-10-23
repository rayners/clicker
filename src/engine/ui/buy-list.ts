/**
 * Lists of things to buy: each row's name, how many are owned, what it does, and a price button that waits until
 * it can be afforded.
 * @module
 */
import { h, setAttr, setText } from './dom';

/** How a game writes and says its prices. */
export interface Currency {
  /** On the button: `123 CR`, `$123`. */
  text(cost: number): string;
  /** For a screen reader: `123 credits`, `$123`. */
  spoken(cost: number): string;
  /** Between the verb and the price on the button (default a space). */
  separator?: string;
}

/** A line in a row's foot: what an item does, what one more would add. */
export interface BuyNote<S> {
  read(s: S): string;
  aria?: string;
  /** A class in place of `<class>-rate`. */
  className?: string;
  /** Marks the note for the stylesheet (e.g. a purchase that would add nothing). */
  wasted?(s: S): boolean;
}

/** One thing to buy. */
export interface BuyItem<S> {
  id: string;
  name: string;
  description: string;
  /** The button's verb (default BUY). */
  verb?: string;
  /** The verb a screen reader hears, when it differs from the button's (default the button's verb). */
  ariaVerb?: string;
  /** The item as a screen reader hears it in "Buy <name> for …" (default its name). */
  ariaName?: string;
  /** How many are owned, or a level. */
  owned?(s: S): string;
  ownedAria?: string;
  notes?: readonly BuyNote<S>[];
  /** A line under the description (e.g. who is ready, out and wounded). */
  detail?(s: S): string;
  /** Its price now, or null when there is nothing to buy (sold out, at the cap). */
  price(s: S): number | null;
  /** More than money: false keeps the button disabled (e.g. nobody free to hire). */
  can?(s: S): boolean;
  onBuy(): void;
  /** Whether it is revealed yet (default always). */
  shown?(s: S): boolean;
}

/** How a game fills a buy list. */
export interface BuyListOptions<S> {
  /** A fixed list, or what is on offer now (rows are kept by id as the offer changes). */
  items: readonly BuyItem<S>[] | ((s: S) => readonly BuyItem<S>[]);
  funds(s: S): number;
  currency: Currency;
  /** Names its parts: `<class>-list`, `<class>-row`, `<class>-head`, `<class>-name`, `<class>-owned`, `<class>-desc`, `<class>-foot`, `<class>-rate`. */
  className?: string;
  /** The class for each row, in place of `<class>-row`. */
  rowClass?: string;
  /** Give each row its item's name as an accessible name. */
  named?: boolean;
}

const capital = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** A buy list; `render` updates owned counts, notes, prices and what can be afforded. */
export function createBuyList<S>(options: BuyListOptions<S>): { el: HTMLUListElement; render(s: S): void; hasAffordable(s: S): boolean } {
  const cls = options.className ?? 'sys';
  const { currency } = options;
  const el = h('ul', { class: `${cls}-list` });
  const offered = (s: S) => (typeof options.items === 'function' ? options.items(s) : options.items);

  const build = (item: BuyItem<S>) => {
    const owned = h('span', { class: `${cls}-owned`, ...(item.ownedAria ? { 'aria-label': item.ownedAria } : {}) });
    const notes = (item.notes ?? []).map((n) => ({ n, el: h('span', { class: n.className ?? `${cls}-rate`, ...(n.aria ? { 'aria-label': n.aria } : {}) }) }));
    const button = h('button', { class: 'buy', type: 'button' });
    button.addEventListener('click', () => item.onBuy());
    const detail = h('p', { class: `${cls}-detail` });
    const li = h(
      'li',
      { class: options.rowClass ?? `${cls}-row`, ...(options.named ? { 'aria-label': item.name } : {}) },
      h('div', { class: `${cls}-head` }, h('span', { class: `${cls}-name` }, item.name), ...(item.owned ? [owned] : [])),
      h('p', { class: `${cls}-desc` }, item.description),
      ...(item.detail ? [detail] : []),
      h('div', { class: `${cls}-foot` }, h('span', { class: `${cls}-rates` }, ...notes.map((x) => x.el)), button),
    );
    return { item, li, owned, notes, button, detail };
  };
  type Row = ReturnType<typeof build>;
  const rows = new Map<string, Row>();

  const priceOf = (item: BuyItem<S>, s: S) => (item.shown?.(s) ?? true ? item.price(s) : null);

  return {
    el,
    hasAffordable: (s) => offered(s).some((item) => {
      const cost = priceOf(item, s);
      return cost !== null && cost <= options.funds(s) && (item.can?.(s) ?? true);
    }),
    render(s) {
      const items = offered(s);
      const ids = new Set(items.map((i) => i.id));
      for (const [id, row] of rows) {
        if (ids.has(id)) continue;
        row.li.remove();
        rows.delete(id);
      }
      items.forEach((item, index) => {
        let row = rows.get(item.id);
        if (!row) {
          row = build(item);
          rows.set(item.id, row);
        }
        if (el.children[index] !== row.li) el.insertBefore(row.li, el.children[index] ?? null);
        const shown = item.shown?.(s) ?? true;
        row.li.hidden = !shown;
        if (!shown) return;
        if (item.owned) setText(row.owned, item.owned(s));
        if (item.detail) setText(row.detail, item.detail(s));
        for (const x of row.notes) {
          setText(x.el, x.n.read(s));
          if (x.n.wasted) x.el.dataset.wasted = String(x.n.wasted(s));
        }
        const cost = item.price(s);
        row.button.hidden = cost === null;
        if (cost === null) return;
        const verb = item.verb ?? 'BUY';
        // An empty verb leaves just the price on the button.
        setText(row.button, verb ? `${verb}${currency.separator ?? ' '}${currency.text(cost)}` : currency.text(cost));
        setAttr(row.button, 'aria-label', `${item.ariaVerb ?? capital(verb)} ${item.ariaName ?? item.name} for ${currency.spoken(cost)}`);
        row.button.disabled = options.funds(s) < cost || !(item.can?.(s) ?? true);
      });
    },
  };
}

/** How a game lays out a panel of buy lists. */
export interface BuyPanelOptions<S> extends Omit<BuyListOptions<S>, 'items'> {
  title: string;
  /** Each section: its heading, an optional running total beside it, and its items. */
  sections: readonly { heading: string; total?(s: S): string; items: BuyListOptions<S>['items'] }[];
  titleClass?: string;
  /** The class for section headings; their totals get `<class>-value`. */
  headingClass?: string;
}

/** A panel: a title, then a heading and buy list per section. */
export function createBuyPanel<S>(options: BuyPanelOptions<S>): { el: HTMLElement; render(s: S): void; hasAffordable(s: S): boolean } {
  const headingClass = options.headingClass ?? 'panel-subtitle';
  const sections = options.sections.map((section) => {
    const total = h('span', { class: `${headingClass}-value` });
    const list = createBuyList<S>({ ...options, items: section.items });
    return { section, total, list, heading: h('h3', { class: headingClass }, `${section.heading}${section.total ? ' ' : ''}`, ...(section.total ? [total] : [])) };
  });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: options.titleClass ?? 'panel-title' }, options.title), ...sections.flatMap((x) => [x.heading, x.list.el]));
  return {
    el,
    hasAffordable: (s) => sections.some((x) => x.list.hasAffordable(s)),
    render(s) {
      for (const x of sections) {
        if (x.section.total) setText(x.total, x.section.total(s));
        x.list.render(s);
      }
    },
  };
}
