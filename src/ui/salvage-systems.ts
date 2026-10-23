import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { CUTTERS, SHORING } from '../data/salvage/systems';
import { cutForce, cutterCost, cutterForce, isCutterRevealed, isShoringRevealed, shoringCost, salvageGain, shoringHold } from '../mission/salvage/economy';
import type { SalvageMission } from '../mission/state';
import { h, setAttr, setText } from '../engine/ui/dom';

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
  const gain = h('span', { class: 'sys-gain', 'aria-label': `${name} gain` });
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

/** What one more adds where it matters, and why when it adds nothing. */
function showGain(r: Row, text: string | null, why: string) {
  setText(r.gain, text ?? `+0 · ${why}`);
  r.gain.dataset.wasted = String(text === null);
}

function price(r: Row, verb: string, name: string, cost: number, credits: number) {
  setText(r.button, `${verb.toUpperCase()} ${formatNumber(cost)} CR`);
  setAttr(r.button, 'aria-label', `${verb} ${name} for ${formatNumber(cost)} credits`);
  r.button.disabled = credits < cost;
}

/** The salvage crew: cutters on the frontier, and the shoring that keeps opened compartments open. */
export function createSalvageSystemsPanel(store: Store): { el: HTMLElement; render(m: SalvageMission): void } {
  const cutters = CUTTERS.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyCutter', id: def.id })) }));
  const shoring = SHORING.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyShoring', id: def.id })) }));
  const totalCut = h('span', { class: 'panel-subtitle-value' });
  const totalHold = h('span', { class: 'panel-subtitle-value' });

  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'SALVAGE CREW'),
    h('h3', { class: 'panel-subtitle' }, 'SHORING ', totalHold),
    h('ul', { class: 'sys-list' }, ...shoring.map((s) => s.el)),
    h('h3', { class: 'panel-subtitle' }, 'CUTTING ', totalCut),
    h('ul', { class: 'sys-list' }, ...cutters.map((c) => c.el)),
  );

  function render(m: SalvageMission) {
    setText(totalCut, formatNumber(cutForce(m)));
    setText(totalHold, `HOLDS ${formatNumber(shoringHold(m))}`);
    for (const s of shoring) {
      const revealed = isShoringRevealed(m, s.index);
      s.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.shoring[s.def.id] ?? 0;
      setText(s.owned, String(count));
      setText(s.rate, `HOLDS ${formatNumber(shoringHold({ ...m, shoring: { [s.def.id]: 1 } }))} EA`);
      const hold = salvageGain(m, { shoring: s.def.id }).hold;
      showGain(s, hold > 0 ? `+${formatNumber(hold)} HOLD` : null, 'BRACED ENOUGH');
      price(s, 'Fit', s.def.name, shoringCost(s.def, count), m.credits);
    }
    for (const c of cutters) {
      const revealed = isCutterRevealed(m, c.index);
      c.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.cutters[c.def.id] ?? 0;
      setText(c.owned, String(count));
      setText(c.rate, `${formatNumber(cutterForce(m, c.def))} CUT EA`);
      const pay = salvageGain(m, { cutter: c.def.id }).income;
      showGain(c, pay > 0 ? `+${formatNumber(pay)} CR/S` : null, m.sealedFor > 0 ? 'BREACH SEALING' : 'NOTHING LEFT TO CUT');
      price(c, 'Hire', c.def.name, cutterCost(c.def, count), m.credits);
    }
  }

  return { el, render };
}
