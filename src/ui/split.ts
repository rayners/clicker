import type { Store } from '../core/store';
import { SECURITY_UPGRADES } from '../data/security/upgrades';
import { assaultForce, force, holdForce, holdNeeded, isTacticalNetActive } from '../mission/security/economy';
import type { SecurityMission } from '../mission/state';
import { formatNumber } from '../shared/format';
import { h, setText } from '../shared/ui/dom';

const NET = SECURITY_UPGRADES.find((u) => u.effect.kind === 'tacticalNet')!.id;

/** One tap moves a tenth of the detachment between the assault and the line; WARDEN can take it over. */
export function createSplit(store: Store): { el: HTMLElement; render(m: SecurityMission): void } {
  const share = h('span', { class: 'split-share', 'aria-label': 'Assault share' }, '0%');
  const toLine = h('button', { class: 'alloc-step', type: 'button', 'aria-label': 'More to the line' }, '−');
  const toAssault = h('button', { class: 'alloc-step', type: 'button', 'aria-label': 'More to the assault' }, '+');
  toLine.addEventListener('click', () => store.dispatch({ type: 'shiftSplit', step: -1 }));
  toAssault.addEventListener('click', () => store.dispatch({ type: 'shiftSplit', step: 1 }));
  const assault = h('span', { class: 'split-figure' });
  const line = h('span', { class: 'split-figure' });
  const auto = h('p', { class: 'alloc-auto' }, 'WARDEN TACTICAL NET · EXACTLY ENOUGH ON THE LINE, EVERYONE ELSE FORWARD');
  const handover = h('button', { class: 'alloc-handover', type: 'button' });
  handover.addEventListener('click', () => store.dispatch({ type: 'toggleTacticalNet' }));
  const el = h(
    'section',
    { class: 'split', 'aria-label': 'Force split' },
    h(
      'div',
      { class: 'split-row' },
      h('div', { class: 'split-side' }, h('span', { class: 'alloc-name' }, 'ASSAULT'), assault),
      h('div', { class: 'alloc-steps' }, toLine, share, toAssault),
      h('div', { class: 'split-side split-side-line' }, h('span', { class: 'alloc-name' }, 'LINE'), line),
    ),
    auto,
    handover,
  );

  function render(m: SecurityMission) {
    const automated = isTacticalNetActive(m);
    const total = force(m);
    const pct = automated ? (total > 0 ? Math.round((assaultForce(m) / total) * 100) : 0) : m.assaultShare * 10;
    setText(share, `${pct}%`);
    setText(assault, formatNumber(assaultForce(m)));
    const need = holdNeeded(m);
    setText(line, `${formatNumber(Math.min(holdForce(m), need))} / ${formatNumber(need)}`);
    el.dataset.stretched = String(holdForce(m) < need);
    el.dataset.auto = String(automated);
    auto.hidden = !automated;
    toLine.hidden = automated;
    toAssault.hidden = automated;
    handover.hidden = !m.upgrades.includes(NET);
    const label = automated ? 'Take control from WARDEN' : 'Return control to WARDEN';
    setText(handover, label.toUpperCase());
    handover.setAttribute('aria-label', label);
  }

  return { el, render };
}
