import { formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { BUILDINGS } from '../forest-data/buildings';
import { buildingCost, PENANCE_AMOUNT, penanceCost } from '../forest/company';
import type { Company } from '../forest/state';
import type { ForestStore } from '../forest/store';

/** The company hall at Thistlegate: improvements, and the Synod's penance. */
export function createHall(store: ForestStore): { el: HTMLElement; render(c: Company): void } {
  const rows = BUILDINGS.map((b) => {
    const level = h('span', { class: 'sys-owned' });
    const button = h('button', { class: 'buy', type: 'button' });
    button.addEventListener('click', () => store.dispatch({ type: 'buyBuilding', id: b.id }));
    const el = h(
      'li',
      { class: 'sys-row' },
      h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, b.name), level),
      h('p', { class: 'sys-desc' }, b.description),
      h('div', { class: 'sys-foot' }, h('span'), button),
    );
    return { b, el, level, button };
  });
  const penanceButton = h('button', { class: 'buy penance', type: 'button' });
  penanceButton.addEventListener('click', () => store.dispatch({ type: 'penance' }));
  const blight = h('span', { class: 'sys-owned' });
  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'The Hall at Thistlegate'),
    h('ul', { class: 'sys-list' }, ...rows.map((r) => r.el)),
    h('h3', { class: 'panel-subtitle' }, 'The Lantern Synod'),
    h(
      'div',
      { class: 'sys-row' },
      h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, 'PENANCE'), blight),
      h('p', { class: 'sys-desc' }, `A tithe to the Synod, and a night of prayer for every hand. Lifts ${PENANCE_AMOUNT}% of the company's blight.`),
      h('div', { class: 'sys-foot' }, h('span'), penanceButton),
    ),
  );

  function render(c: Company) {
    for (const r of rows) {
      const cost = buildingCost(c, r.b.id);
      setText(r.level, `LV ${c.buildings[r.b.id]}`);
      setText(r.button, `BUILD · ${formatNumber(cost)} ₮`);
      setAttr(r.button, 'aria-label', `Build ${r.b.name.toLowerCase()} for ${formatNumber(cost)} thalers`);
      r.button.disabled = c.silver < cost;
    }
    const cost = penanceCost(c);
    setText(blight, `BLIGHT ${Math.round(c.blight)}%`);
    setText(penanceButton, `PAY · ${formatNumber(cost)} ₮`);
    setAttr(penanceButton, 'aria-label', `Pay penance for ${formatNumber(cost)} thalers`);
    penanceButton.disabled = c.silver < cost || c.blight <= 0;
  }

  return { el, render };
}
