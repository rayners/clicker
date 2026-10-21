import { formatNumber } from '../shared/format';
import type { Store } from '../core/store';
import { carCost, carValue, engineCost, engineThrust, isCarRevealed, isEngineRevealed, thrust, trainMass, trainValue } from '../mission/haulage/economy';
import type { HaulageMission } from '../mission/state';
import { h, setAttr, setText } from '../shared/ui/dom';
import type { HaulProfile } from '../mission/haulage/profiles';
import type { HaulWords } from './haul-words';

interface Row {
  el: HTMLLIElement;
  owned: HTMLElement;
  rate: HTMLElement;
  button: HTMLButtonElement;
}

function row(name: string, description: string, action: () => void): Row {
  const owned = h('span', { class: 'sys-owned', 'aria-label': `${name} owned` }, '0');
  const rate = h('span', { class: 'sys-rate' });
  const button = h('button', { class: 'buy', type: 'button' });
  button.addEventListener('click', action);
  const el = h(
    'li',
    { class: 'sys-row' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, name), owned),
    h('p', { class: 'sys-desc' }, description),
    h('div', { class: 'sys-foot' }, rate, button),
  );
  return { el, owned, rate, button };
}

function price(r: Row, verb: string, name: string, cost: number, credits: number) {
  setText(r.button, `${verb.toUpperCase()} ${formatNumber(cost)} CR`);
  setAttr(r.button, 'aria-label', `${verb} ${name} for ${formatNumber(cost)} credits`);
  r.button.disabled = credits < cost;
}

/** The train: engines for thrust, and the cars whose freight pays and whose mass slows everything down. */
export function createHaulageSystemsPanel(store: Store, profile: HaulProfile, words: HaulWords): { el: HTMLElement; render(m: HaulageMission): void } {
  const engines = profile.engines.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyEngine', id: def.id })) }));
  const cars = profile.cars.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyCar', id: def.id })) }));
  const totalThrust = h('span', { class: 'panel-subtitle-value' });
  const totalFreight = h('span', { class: 'panel-subtitle-value' });

  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, words.panelTitle),
    h('h3', { class: 'panel-subtitle' }, `${words.engines} `, totalThrust),
    h('ul', { class: 'sys-list' }, ...engines.map((e) => e.el)),
    h('h3', { class: 'panel-subtitle' }, `${words.cars} `, totalFreight),
    h('ul', { class: 'sys-list' }, ...cars.map((c) => c.el)),
  );

  function render(m: HaulageMission) {
    setText(totalThrust, `${formatNumber(thrust(m))} THRUST`);
    setText(totalFreight, `${formatNumber(trainValue(m))} CR/KM · ${formatNumber(trainMass(m))} T`);
    for (const e of engines) {
      const revealed = isEngineRevealed(m, e.index);
      e.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.engines[e.def.id] ?? 0;
      setText(e.owned, String(count));
      setText(e.rate, `+${formatNumber(engineThrust(m, e.def))} THRUST EA`);
      price(e, words.fit, e.def.name, engineCost(e.def, count), m.credits);
    }
    for (const c of cars) {
      const revealed = isCarRevealed(m, c.index);
      c.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.cars[c.def.id] ?? 0;
      setText(c.owned, String(count));
      setText(c.rate, `+${formatNumber(carValue(m, c.def))} CR/KM · +${formatNumber(c.def.mass)} T EA`);
      price(c, words.couple, c.def.name, carCost(c.def, count), m.credits);
    }
  }

  return { el, render };
}
