import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { FABRICATORS, TROOPERS } from '../data/security/systems';
import {
  ammoSupply,
  fabricatorCost,
  force,
  isFabricatorRevealed,
  isTrooperRevealed,
  pushGain,
  sentryCost,
  sentryHold,
  trooperCost,
  trooperForce,
} from '../mission/security/economy';
import type { SecurityMission } from '../mission/state';
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

/** What one more adds where it matters, the push at the frontier or the line; and why, when it adds nothing. */
function showGain(r: Row, g: { assault: number; hold: number }, why: string) {
  const text = g.assault > 0 ? `+${formatNumber(g.assault)} PUSH` : g.hold > 0 ? `+${formatNumber(g.hold)} LINE` : `+0 · ${why}`;
  setText(r.gain, text);
  r.gain.dataset.wasted = String(g.assault <= 0 && g.hold <= 0);
}

function price(r: Row, verb: string, name: string, cost: number, credits: number) {
  setText(r.button, `${verb.toUpperCase()} ${formatNumber(cost)} CR`);
  setAttr(r.button, 'aria-label', `${verb} ${name} for ${formatNumber(cost)} credits`);
  r.button.disabled = credits < cost;
}

const SENTRY_NAME = 'SENTRY GUN';

/** The detachment: troopers, the ammunition that feeds them, and sentry guns to hold the line. */
export function createSecuritySystemsPanel(store: Store): { el: HTMLElement; render(m: SecurityMission): void } {
  const troopers = TROOPERS.map((def, index) => ({
    def,
    index,
    ...row(def.name, def.description, () => store.dispatch({ type: 'buyTrooper', id: def.id })),
  }));
  const fabricators = FABRICATORS.map((def, index) => ({
    def,
    index,
    ...row(def.name, def.description, () => store.dispatch({ type: 'buyFabricator', id: def.id })),
  }));
  const sentry = row(
    SENTRY_NAME,
    'Automated turrets on tripods. They hold a corridor without sleeping, eating or asking questions, and burn ammunition doing it.',
    () => store.dispatch({ type: 'buySentry' }),
  );
  const totalForce = h('span', { class: 'panel-subtitle-value' });
  const totalAmmo = h('span', { class: 'panel-subtitle-value' });

  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'DETACHMENT'),
    h('h3', { class: 'panel-subtitle' }, 'AMMUNITION ', totalAmmo),
    h('ul', { class: 'sys-list' }, ...fabricators.map((f) => f.el)),
    h('h3', { class: 'panel-subtitle' }, 'FORCE ', totalForce),
    h('ul', { class: 'sys-list' }, ...troopers.map((t) => t.el)),
    h('h3', { class: 'panel-subtitle' }, 'THE LINE'),
    h('ul', { class: 'sys-list' }, sentry.el),
  );

  function render(m: SecurityMission) {
    setText(totalForce, formatNumber(force(m)));
    setText(totalAmmo, `${formatNumber(ammoSupply(m))} RDS/S`);
    for (const f of fabricators) {
      const revealed = isFabricatorRevealed(m, f.index);
      f.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.fabricators[f.def.id] ?? 0;
      setText(f.owned, String(count));
      setText(f.rate, `+${formatNumber(f.def.rate)} RDS/S EA`);
      showGain(f, pushGain(m, { fabricator: f.def.id }), 'AMMUNITION ENOUGH');
      price(f, 'Build', f.def.name, fabricatorCost(f.def, count), m.credits);
    }
    for (const t of troopers) {
      const revealed = isTrooperRevealed(m, t.index);
      t.el.hidden = !revealed;
      if (!revealed) continue;
      const count = m.troopers[t.def.id] ?? 0;
      setText(t.owned, String(count));
      setText(t.rate, `${formatNumber(trooperForce(m, t.def))} FORCE EA`);
      showGain(t, pushGain(m, { trooper: t.def.id }), 'NOWHERE TO SEND THEM');
      price(t, 'Deploy', t.def.name, trooperCost(t.def, count), m.credits);
    }
    setText(sentry.owned, String(m.sentries));
    setText(sentry.rate, `HOLDS ${formatNumber(m.sentries > 0 ? sentryHold(m) / m.sentries : sentryHold({ ...m, sentries: 1 }))} EA`);
    showGain(sentry, pushGain(m, { sentry: true }), 'LINE ALREADY HELD');
    price(sentry, 'Install', SENTRY_NAME, sentryCost(m), m.credits);
  }

  return { el, render };
}
