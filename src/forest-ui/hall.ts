import { h, setText } from '../engine/ui/dom';
import { createBuyList } from '../engine/ui/buy-list';
import { BUILDINGS } from '../forest-data/buildings';
import { availableUpgrades, buildingCost, PENANCE_AMOUNT, penanceCost } from '../forest/company';
import { FOREST_UPGRADES } from '../forest-data/upgrades';
import type { Company } from '../forest/state';
import type { ForestStore } from '../forest/store';
import { THALERS } from './currency';

/** The company hall at Thistlegate: improvements, and the Synod's penance. */
export function createHall(store: ForestStore): { el: HTMLElement; render(c: Company): void } {
  const list = (items: Parameters<typeof createBuyList<Company>>[0]['items']) => createBuyList<Company>({ funds: (c) => c.silver, currency: THALERS, items });
  const buildings = list(
    BUILDINGS.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      verb: 'BUILD',
      ariaName: b.name.toLowerCase(),
      owned: (c: Company) => `LV ${c.buildings[b.id]}`,
      price: (c: Company) => buildingCost(c, b.id),
      onBuy: () => store.dispatch({ type: 'buyBuilding', id: b.id }),
    })),
  );
  const requisitions = list((c) =>
    availableUpgrades(c).map((u) => ({
      id: u.id,
      name: u.name,
      description: u.description,
      verb: 'REQUISITION',
      ariaName: u.name.toLowerCase(),
      price: () => u.cost,
      onBuy: () => store.dispatch({ type: 'buyUpgrade', id: u.id }),
    })),
  );
  const penance = list([
    {
      id: 'penance',
      name: 'PENANCE',
      description: `A tithe to the Synod, and a night of prayer for every hand. Lifts ${PENANCE_AMOUNT}% of the company's blight.`,
      verb: 'PAY',
      ariaName: 'penance',
      owned: (c: Company) => `BLIGHT ${Math.round(c.blight)}%`,
      price: penanceCost,
      can: (c: Company) => c.blight > 0,
      onBuy: () => store.dispatch({ type: 'penance' }),
    },
  ]);
  const installed = h('p', { class: 'installed' });
  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'The Hall at Thistlegate'),
    buildings.el,
    h('h3', { class: 'panel-subtitle' }, 'REQUISITIONS'),
    requisitions.el,
    installed,
    h('h3', { class: 'panel-subtitle' }, 'The Lantern Synod'),
    penance.el,
  );

  function render(c: Company) {
    buildings.render(c);
    requisitions.render(c);
    penance.render(c);
    const owned = FOREST_UPGRADES.filter((u) => c.upgrades.includes(u.id)).map((u) => u.name);
    setText(installed, owned.length > 0 ? `IN HAND: ${owned.join(' · ')}` : '');
  }

  return { el, render };
}
