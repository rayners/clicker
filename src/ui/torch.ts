import type { Store } from '../core/store';
import { SALVAGE_UPGRADES } from '../data/salvage/upgrades';
import { effectiveNotch, isGovernorActive, isSealed, safeLine } from '../mission/salvage/economy';
import type { SalvageMission } from '../mission/state';
import { h, setText } from '../engine/ui/dom';

const GOVERNOR = SALVAGE_UPGRADES.find((u) => u.effect.kind === 'governor')!.id;

/** The torch dial and the hull's stress gauge: one notch per tap, and WARDEN's hull governor. */
export function createTorch(store: Store): { el: HTMLElement; render(m: SalvageMission): void } {
  const notch = h('span', { class: 'split-share', 'aria-label': 'Torch notch' }, '5');
  const cooler = h('button', { class: 'alloc-step', type: 'button', 'aria-label': 'Cooler torch' }, '−');
  const hotter = h('button', { class: 'alloc-step', type: 'button', 'aria-label': 'Hotter torch' }, '+');
  cooler.addEventListener('click', () => store.dispatch({ type: 'shiftNotch', step: -1 }));
  hotter.addEventListener('click', () => store.dispatch({ type: 'shiftNotch', step: 1 }));
  const line = h('span', { class: 'split-figure' });
  const stress = h('span', { class: 'split-figure', 'aria-label': 'Hull stress' }, '0%');
  const gauge = h('i', { class: 'torch-fill' });
  const auto = h('p', { class: 'alloc-auto' }, 'WARDEN HULL GOVERNOR · AS HOT AS THE HULL ALLOWS, BACKING OFF BEFORE A BREACH');
  const handover = h('button', { class: 'alloc-handover', type: 'button' });
  handover.addEventListener('click', () => store.dispatch({ type: 'toggleGovernor' }));
  const el = h(
    'section',
    { class: 'split torch', 'aria-label': 'Cutting torch' },
    h(
      'div',
      { class: 'split-row' },
      h('div', { class: 'split-side' }, h('span', { class: 'alloc-name' }, 'TORCH'), line),
      h('div', { class: 'alloc-steps' }, cooler, notch, hotter),
      h('div', { class: 'split-side split-side-line' }, h('span', { class: 'alloc-name' }, 'STRESS'), stress),
    ),
    h('span', { class: 'torch-gauge', 'aria-hidden': 'true' }, gauge),
    auto,
    handover,
  );

  function render(m: SalvageMission) {
    const automated = isGovernorActive(m);
    const n = effectiveNotch(m);
    const safe = safeLine(m);
    setText(notch, String(n));
    setText(line, isSealed(m) ? `SEALED ${Math.ceil(m.sealedFor)} S` : n > safe ? `PAST THE LINE (${safe})` : `SAFE TO ${safe}`);
    const pct = Math.round(m.stress * 100);
    setText(stress, `${pct}%`);
    gauge.style.width = `${pct}%`;
    el.dataset.strain = String(n > safe);
    el.dataset.danger = String(m.stress >= 0.75);
    auto.hidden = !automated;
    cooler.hidden = automated;
    hotter.hidden = automated;
    handover.hidden = !m.upgrades.includes(GOVERNOR);
    const label = automated ? 'Take control from WARDEN' : 'Return control to WARDEN';
    setText(handover, label.toUpperCase());
    handover.setAttribute('aria-label', label);
  }

  return { el, render };
}
