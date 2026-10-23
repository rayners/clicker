import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { GENERATORS } from '../data/extraction/generators';
import {
  generatorCost,
  generatorRate,
  isGeneratorRevealed,
  refineryCapacity,
  incomeGain,
  refineryCost,
} from '../mission/extraction/economy';
import type { ExtractionMission as MissionState } from '../mission/state';
import { h, setAttr, setText } from '../engine/ui/dom';

export function createSystemsPanel(store: Store): { el: HTMLElement; render(m: MissionState): void } {
  const rows = GENERATORS.map((def, index) => {
    const owned = h('span', { class: 'sys-owned', 'aria-label': `${def.name} owned` }, '0');
    const rate = h('span', { class: 'sys-rate' });
    const gain = h('span', { class: 'sys-gain', 'aria-label': `${def.name} income` });
    const button = h('button', { class: 'buy', type: 'button' });
    button.addEventListener('click', () => store.dispatch({ type: 'buyGenerator', id: def.id }));
    const el = h(
      'li',
      { class: 'sys-row' },
      h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, def.name), owned),
      h('p', { class: 'sys-desc' }, def.description),
      h('div', { class: 'sys-foot' }, h('span', { class: 'sys-rates' }, rate, gain), button),
    );
    return { def, index, el, owned, rate, gain, button };
  });

  const refineryLevel = h('span', { class: 'sys-owned', 'aria-label': 'Refinery level' });
  const refineryRate = h('span', { class: 'sys-rate' });
  const refineryGain = h('span', { class: 'sys-gain', 'aria-label': 'Refinery income' });
  const refineryButton = h('button', { class: 'buy', type: 'button' });
  refineryButton.addEventListener('click', () => store.dispatch({ type: 'buyRefinery' }));
  const refineryRow = h(
    'li',
    { class: 'sys-row sys-refinery' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, 'ORBITAL REFINERY'), refineryLevel),
    h('p', { class: 'sys-desc' }, 'Converts raw ore to Combine scrip. Throughput is the bottleneck.'),
    h('div', { class: 'sys-foot' }, h('span', { class: 'sys-rates' }, refineryRate, refineryGain), refineryButton),
  );

  const el = h(
    'div',
    { class: 'panel-body' },
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
      // What it does to income, which is what the player is really buying: nothing, if the refinery is the limit.
      const gain = incomeGain(m, { generator: row.def.id });
      setText(row.gain, gain > 0 ? `+${formatNumber(gain)} CR/S` : '+0 CR/S · REFINERY FULL');
      row.gain.dataset.wasted = String(gain <= 0);
      setText(row.button, `ACQUIRE ${formatNumber(cost)} CR`);
      setAttr(row.button, 'aria-label', `Acquire ${row.def.name} for ${formatNumber(cost)} credits`);
      row.button.disabled = m.credits < cost;
    }
    const rCost = refineryCost(m);
    setText(refineryLevel, `LV ${m.refineryLevel}`);
    setText(refineryRate, `${formatNumber(refineryCapacity(m))} ORE/S`);
    const rGain = incomeGain(m, { refinery: true });
    setText(refineryGain, rGain > 0 ? `+${formatNumber(rGain)} CR/S` : '+0 CR/S · NEEDS MORE ORE');
    refineryGain.dataset.wasted = String(rGain <= 0);
    setText(refineryButton, `UPGRADE ${formatNumber(rCost)} CR`);
    setAttr(refineryButton, 'aria-label', `Upgrade refinery for ${formatNumber(rCost)} credits`);
    refineryButton.disabled = m.credits < rCost;
  }

  return { el, render };
}
