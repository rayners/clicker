import { formatNumber } from '../core/format';
import type { Store } from '../core/store';
import { UPGRADES } from '../data/upgrades';
import type { MissionState } from '../mission/state';
import { availableUpgrades } from '../mission/upgrades';
import { h, setAttr, setText } from './dom';

export function hasUpgradesToShow(m: MissionState): boolean {
  return m.upgrades.length > 0 || availableUpgrades(m).length > 0;
}

export function createUpgradesPanel(store: Store): { el: HTMLElement; render(m: MissionState): void } {
  const available = h('ul', { class: 'upg-list' });
  const installed = h('ul', { class: 'upg-installed' });
  const rows = new Map<string, { el: HTMLLIElement; button: HTMLButtonElement }>();
  let installedCount = -1;

  const el = h(
    'section',
    { class: 'panel panel-upgrades', role: 'tabpanel', id: 'panel-upgrades', 'aria-labelledby': 'tab-upgrades' },
    h('h2', { class: 'panel-title' }, 'REQUISITIONS'),
    available,
    h('h3', { class: 'panel-subtitle' }, 'INSTALLED'),
    installed,
  );

  function render(m: MissionState) {
    const list = availableUpgrades(m);
    const ids = new Set(list.map((u) => u.id));
    for (const [id, row] of rows) {
      if (!ids.has(id)) {
        row.el.remove();
        rows.delete(id);
      }
    }
    list.forEach((u, index) => {
      let row = rows.get(u.id);
      if (!row) {
        const button = h('button', {
          class: 'buy',
          type: 'button',
          'aria-label': `Purchase ${u.name} for ${formatNumber(u.cost)} credits`,
        }, `BUY ${formatNumber(u.cost)} CR`);
        button.addEventListener('click', () => store.dispatch({ type: 'buyUpgrade', id: u.id }));
        const li = h(
          'li',
          { class: 'sys-row' },
          h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, u.name)),
          h('p', { class: 'sys-desc' }, u.description),
          h('div', { class: 'sys-foot' }, h('span'), button),
        );
        row = { el: li, button };
        rows.set(u.id, row);
      }
      if (available.children[index] !== row.el) available.insertBefore(row.el, available.children[index] ?? null);
      row.button.disabled = m.credits < u.cost;
    });

    if (m.upgrades.length !== installedCount) {
      installedCount = m.upgrades.length;
      installed.replaceChildren(
        ...UPGRADES.filter((u) => m.upgrades.includes(u.id)).map((u) => h('li', { class: 'upg-done' }, `■ ${u.name}`)),
      );
    }
    setAttr(el, 'data-count', String(list.length));
    setText(el.querySelector('.panel-subtitle')!, `INSTALLED (${m.upgrades.length})`);
  }

  return { el, render };
}
