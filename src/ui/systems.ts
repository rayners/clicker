import { formatNumber } from '../core/format';
import type { Store } from '../core/store';
import { GENERATORS } from '../data/generators';
import {
  generatorCost,
  generatorRate,
  isGeneratorRevealed,
  refineryCapacity,
  refineryCost,
} from '../mission/economy';
import type { MissionState } from '../mission/state';
import { h, setAttr, setText } from './dom';

export function createSystemsPanel(store: Store): { el: HTMLElement; render(m: MissionState): void } {
  const rows = GENERATORS.map((def, index) => {
    const owned = h('span', { class: 'sys-owned', 'aria-label': `${def.name} owned` }, '0');
    const rate = h('span', { class: 'sys-rate' });
    const button = h('button', { class: 'buy', type: 'button' });
    button.addEventListener('click', () => store.dispatch({ type: 'buyGenerator', id: def.id }));
    const el = h(
      'li',
      { class: 'sys-row' },
      h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, def.name), owned),
      h('p', { class: 'sys-desc' }, def.description),
      h('div', { class: 'sys-foot' }, rate, button),
    );
    return { def, index, el, owned, rate, button };
  });

  const refineryLevel = h('span', { class: 'sys-owned', 'aria-label': 'Refinery level' });
  const refineryRate = h('span', { class: 'sys-rate' });
  const refineryButton = h('button', { class: 'buy', type: 'button' });
  refineryButton.addEventListener('click', () => store.dispatch({ type: 'buyRefinery' }));
  const refineryRow = h(
    'li',
    { class: 'sys-row sys-refinery' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, 'ORBITAL REFINERY'), refineryLevel),
    h('p', { class: 'sys-desc' }, 'Converts raw ore to Combine scrip. Throughput is the bottleneck.'),
    h('div', { class: 'sys-foot' }, refineryRate, refineryButton),
  );

  const el = h(
    'section',
    { class: 'panel panel-systems', role: 'tabpanel', id: 'panel-systems', 'aria-labelledby': 'tab-systems' },
    h('h2', { class: 'panel-title' }, 'EXTRACTION SYSTEMS'),
    h('ul', { class: 'sys-list' }, refineryRow, ...rows.map((r) => r.el)),
  );

  function render(m: MissionState) {
    for (const row of rows) {
      const revealed = isGeneratorRevealed(m, row.index);
      row.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.generators[row.def.id] ?? 0;
      const cost = generatorCost(row.def, count);
      setText(row.owned, String(count));
      setText(row.rate, `+${formatNumber(generatorRate(m, row.def))} ORE/S EA`);
      setText(row.button, `ACQUIRE ${formatNumber(cost)} CR`);
      setAttr(row.button, 'aria-label', `Acquire ${row.def.name} for ${formatNumber(cost)} credits`);
      row.button.disabled = m.credits < cost;
    }
    const rCost = refineryCost(m);
    setText(refineryLevel, `LV ${m.refineryLevel}`);
    setText(refineryRate, `${formatNumber(refineryCapacity(m))} ORE/S`);
    setText(refineryButton, `UPGRADE ${formatNumber(rCost)} CR`);
    setAttr(refineryButton, 'aria-label', `Upgrade refinery for ${formatNumber(rCost)} credits`);
    refineryButton.disabled = m.credits < rCost;
  }

  return { el, render };
}
