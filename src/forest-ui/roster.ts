import { formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { CLASSES } from '../forest-data/classes';
import { available, hireCost } from '../forest/company';
import type { Company } from '../forest/state';
import type { ForestStore } from '../forest/store';

const PER_MINUTE = 60;

/** Hire hands; see who is ready, out in the wood, or mending, and what they cost to keep. */
export function createRoster(store: ForestStore): { el: HTMLElement; render(c: Company): void } {
  const rows = CLASSES.map((k) => {
    const counts = h('p', { class: 'roster-counts' });
    const wage = h('span', { class: 'sys-rate' });
    const hire = h('button', { class: 'buy', type: 'button' });
    hire.addEventListener('click', () => store.dispatch({ type: 'hire', id: k.id }));
    const total = h('span', { class: 'sys-owned' });
    const el = h(
      'article',
      { class: 'sys-row roster-row', 'aria-label': k.plural, 'data-class': k.id },
      h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, k.plural), total),
      h('p', { class: 'sys-desc' }, k.description),
      counts,
      h('div', { class: 'sys-foot' }, wage, hire),
    );
    return { k, el, counts, wage, hire, total };
  });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'Roster of Hands'), ...rows.map((r) => r.el));

  function render(c: Company) {
    for (const r of rows) {
      const id = r.k.id;
      const ready = available(c, id);
      const wounded = c.wounded[id];
      const out = c.hired[id] - ready - wounded;
      setText(r.total, String(c.hired[id]));
      setText(r.counts, `${ready} READY · ${out} IN THE WOOD · ${wounded} WOUNDED`);
      setText(r.wage, `${formatNumber(r.k.wage * PER_MINUTE)} THALERS/MIN EACH`);
      const cost = hireCost(c, id);
      setText(r.hire, `HIRE · ${formatNumber(cost)} ₮`);
      setAttr(r.hire, 'aria-label', `Hire a ${r.k.name.toLowerCase()} for ${formatNumber(cost)} thalers`);
      r.hire.disabled = c.silver < cost;
    }
  }

  return { el, render };
}
