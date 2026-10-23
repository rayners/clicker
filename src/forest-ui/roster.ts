import { formatNumber } from '../engine/format';
import { h } from '../engine/ui/dom';
import { createBuyList } from '../engine/ui/buy-list';
import { CLASSES } from '../forest-data/classes';
import { available, hireCost, inField, isHireable, postedBlades } from '../forest/company';
import type { Company } from '../forest/state';
import type { ForestStore } from '../forest/store';
import { THALERS } from './currency';

const PER_MINUTE = 60;

/** Hire hands; see who is ready, out with a party, garrisoned at the Keep, or mending, and what they cost to keep. */
export function createRoster(store: ForestStore): { el: HTMLElement; render(c: Company): void } {
  const list = createBuyList<Company>({
    funds: (c) => c.silver,
    currency: THALERS,
    named: true,
    items: CLASSES.map((k) => ({
      id: k.id,
      name: k.plural,
      description: k.description,
      verb: 'HIRE',
      ariaName: `a ${k.name.toLowerCase()}`,
      owned: (c: Company) => String(c.hired[k.id]),
      detail: (c: Company) => {
        const out = `${inField(c, k.id)} ${c.site === 'keep' ? 'ON ASSAULT' : 'IN THE WOOD'}`;
        const posted = k.id === 'blade' && c.site === 'keep' ? ` · ${postedBlades(c)} GARRISONED` : '';
        return `${available(c, k.id)} READY · ${out}${posted} · ${c.wounded[k.id]} WOUNDED`;
      },
      notes: [{ read: () => `${formatNumber(k.wage * PER_MINUTE)} THALERS/MIN EACH` }],
      price: (c: Company) => hireCost(c, k.id),
      shown: (c: Company) => isHireable(c, k.id) || c.hired[k.id] > 0,
      onBuy: () => store.dispatch({ type: 'hire', id: k.id }),
    })),
  });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'Roster of Hands'), list.el);
  return { el, render: list.render };
}
