import { formatNumber } from '../shared/format';
import type { Store } from '../core/store';
import { LINES, PROCESSORS, REACTORS } from '../data/terraform/systems';
import {
  incomeGain,
  isProcessorRevealed,
  isReactorRevealed,
  lineStates,
  power,
  processorCost,
  processorRate,
  reactorCost,
} from '../mission/terraform/economy';
import type { TerraformMission } from '../mission/state';
import { h, setAttr, setText } from '../shared/ui/dom';

interface Row {
  el: HTMLLIElement;
  owned: HTMLElement;
  rate: HTMLElement;
  gain: HTMLElement;
  button: HTMLButtonElement;
}

function row(name: string, description: string, action: () => void): Row {
  const owned = h('span', { class: 'sys-owned', 'aria-label': `${name} owned` }, '0');
  const rate = h('span', { class: 'sys-rate' });
  const gain = h('span', { class: 'sys-gain', 'aria-label': `${name} income` });
  const button = h('button', { class: 'buy', type: 'button' });
  button.addEventListener('click', action);
  const el = h(
    'li',
    { class: 'sys-row' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, name), owned),
    h('p', { class: 'sys-desc' }, description),
    h('div', { class: 'sys-foot' }, h('span', { class: 'sys-rates' }, rate, gain), button),
  );
  return { el, owned, rate, gain, button };
}

/** What one more adds to income, which is what the player is really buying; and why, when it adds nothing. */
function showGain(r: Row, gain: number, why: string) {
  setText(r.gain, gain > 0 ? `+${formatNumber(gain)} CR/S` : `+0 CR/S · ${why}`);
  r.gain.dataset.wasted = String(gain <= 0);
}

function price(r: Row, name: string, cost: number, credits: number) {
  setText(r.button, `BUILD ${formatNumber(cost)} CR`);
  setAttr(r.button, 'aria-label', `Build ${name} for ${formatNumber(cost)} credits`);
  r.button.disabled = credits < cost;
}

/** Reactors, then each processing line's ladder. */
export function createTerraformSystemsPanel(store: Store): { el: HTMLElement; render(m: TerraformMission): void } {
  const reactors = REACTORS.map((def, index) => ({
    def,
    index,
    ...row(def.name, def.description, () => store.dispatch({ type: 'buyReactor', id: def.id })),
  }));
  const processors = PROCESSORS.map((def) => ({
    def,
    ...row(def.name, def.description, () => store.dispatch({ type: 'buyProcessor', id: def.id })),
  }));
  const supply = h('span', { class: 'panel-subtitle-value' });

  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'STATION SYSTEMS'),
    h('h3', { class: 'panel-subtitle' }, 'POWER ', supply),
    h('ul', { class: 'sys-list' }, ...reactors.map((r) => r.el)),
    ...LINES.flatMap((line) => [
      h('h3', { class: 'panel-subtitle' }, `${line.name} LINE`),
      h('ul', { class: 'sys-list' }, ...processors.filter((p) => p.def.line === line.id).map((p) => p.el)),
    ]),
  );

  function render(m: TerraformMission) {
    setText(supply, `${formatNumber(power(m))} MW`);
    for (const r of reactors) {
      const revealed = isReactorRevealed(m, r.index);
      r.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.reactors[r.def.id] ?? 0;
      setText(r.owned, String(count));
      setText(r.rate, `+${formatNumber(r.def.mw)} MW EA`);
      const fed = Object.values(m.processors).some((n) => n > 0);
      showGain(r, incomeGain(m, { reactor: r.def.id }), fed ? 'PROCESSORS FULLY POWERED' : 'NO PROCESSORS TO FEED');
      price(r, r.def.name, reactorCost(r.def, count), m.credits);
    }
    for (const p of processors) {
      const revealed = isProcessorRevealed(m, p.def);
      p.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.processors[p.def.id] ?? 0;
      const rate = processorRate(m, p.def);
      setText(p.owned, String(count));
      setText(p.rate, `+${formatNumber(rate)} U/S · ${formatNumber(rate)} MW EA`);
      showGain(p, incomeGain(m, { processor: p.def.id }), lineStates(m)[p.def.line] === 'power-limited' ? 'NO POWER TO SPARE' : 'OFF SPEC');
      price(p, p.def.name, processorCost(p.def, count), m.credits);
    }
  }

  return { el, render };
}
