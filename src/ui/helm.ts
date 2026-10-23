import type { Store } from '../core/store';
import { effectiveBurn, fuelForLeg, fuelPrice, isAutopilotActive, isDocked, safeBurn } from '../mission/haulage/economy';
import type { HaulageMission } from '../mission/state';
import { formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { profileOf } from '../mission/haulage/profiles';
import type { HaulWords } from './haul-words';

/** The burn dial and the tanks: one notch per tap, fuel only at a station, and WARDEN's autopilot. */
export function createHelm(store: Store, words: HaulWords): { el: HTMLElement; render(m: HaulageMission): void } {
  const burn = h('span', { class: 'split-share', 'aria-label': words.dial.charAt(0) + words.dial.slice(1).toLowerCase() }, '5');
  const gentler = h('button', { class: 'alloc-step', type: 'button', 'aria-label': words.gentler }, '−');
  const hotter = h('button', { class: 'alloc-step', type: 'button', 'aria-label': words.hotter }, '+');
  gentler.addEventListener('click', () => store.dispatch({ type: 'shiftBurn', step: -1 }));
  hotter.addEventListener('click', () => store.dispatch({ type: 'shiftBurn', step: 1 }));
  const line = h('span', { class: 'split-figure' });
  const fuel = h('span', { class: 'split-figure', 'aria-label': 'Fuel' });
  const refuel = h('button', { class: 'buy', type: 'button', 'aria-label': 'Refuel for the next leg' }, 'REFUEL');
  refuel.addEventListener('click', () => store.dispatch({ type: 'refuel' }));
  const auto = h('p', { class: 'alloc-auto' }, 'WARDEN AUTOPILOT · THE BURN THAT EARNS MOST, NEVER PAST THE STRAIN LINE');
  const handover = h('button', { class: 'alloc-handover', type: 'button' });
  handover.addEventListener('click', () => store.dispatch({ type: 'toggleAutopilot' }));
  const el = h(
    'section',
    { class: 'split helm', 'aria-label': 'Helm' },
    h(
      'div',
      { class: 'split-row' },
      h('div', { class: 'split-side' }, h('span', { class: 'alloc-name' }, words.dial), line),
      h('div', { class: 'alloc-steps' }, gentler, burn, hotter),
      h('div', { class: 'split-side split-side-line' }, h('span', { class: 'alloc-name' }, 'FUEL'), fuel),
    ),
    h('div', { class: 'helm-refuel' }, refuel),
    auto,
    handover,
  );

  function render(m: HaulageMission) {
    const automated = isAutopilotActive(m);
    const b = effectiveBurn(m);
    setText(burn, String(b));
    const safe = safeBurn(m);
    setText(line, b > safe ? `PAST THE LINE (${safe})` : `SAFE TO ${safe}`);
    el.dataset.strain = String(b > safe);
    const need = fuelForLeg(m);
    setText(fuel, `${formatNumber(m.fuel)} / ${formatNumber(need)}`);
    el.dataset.dry = String(m.fuel < need);
    const docked = isDocked(m);
    const cost = Math.max(0, need - m.fuel) * fuelPrice(m);
    refuel.disabled = cost <= 0 || m.credits <= 0;
    setText(refuel, docked ? `REFUEL FOR THE NEXT LEG ${formatNumber(cost)} CR` : `${words.tender} ${formatNumber(cost)} CR`);
    refuel.setAttribute('aria-label', docked ? 'Refuel for the next leg' : words.tenderAria);
    auto.hidden = !automated;
    gentler.hidden = automated;
    hotter.hidden = automated;
    const autopilot = profileOf(m).upgrades.find((u) => u.effect.kind === 'autopilot');
    handover.hidden = !autopilot || !m.upgrades.includes(autopilot.id);
    const label = automated ? 'Take control from WARDEN' : 'Return control to WARDEN';
    setText(handover, label.toUpperCase());
    handover.setAttribute('aria-label', label);
  }

  return { el, render };
}
