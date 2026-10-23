import type { Store } from '../core/store';
import { effectiveBurn, fuelForLeg, fuelPrice, isAutopilotActive, isDocked, safeBurn } from '../mission/haulage/economy';
import type { HaulageMission } from '../mission/state';
import { formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { createDial } from '../engine/ui/dial';
import { profileOf } from '../mission/haulage/profiles';
import type { HaulWords } from './haul-words';

/** The burn dial and the tanks: one notch per tap, fuel only at a station, and WARDEN's autopilot. */
export function createHelm(store: Store, words: HaulWords): { el: HTMLElement; render(m: HaulageMission): void } {
  const refuel = h('button', { class: 'buy', type: 'button', 'aria-label': 'Refuel for the next leg' }, 'REFUEL');
  refuel.addEventListener('click', () => store.dispatch({ type: 'refuel' }));
  const autopilot = (m: HaulageMission) => profileOf(m).upgrades.find((u) => u.effect.kind === 'autopilot');
  const dial = createDial<HaulageMission>({
    label: 'Helm',
    className: 'helm',
    value: { aria: words.dial.charAt(0) + words.dial.slice(1).toLowerCase(), read: (m) => String(effectiveBurn(m)) },
    less: { label: words.gentler, onPress: () => store.dispatch({ type: 'shiftBurn', step: -1 }) },
    more: { label: words.hotter, onPress: () => store.dispatch({ type: 'shiftBurn', step: 1 }) },
    sides: [
      { name: words.dial, read: (m) => (effectiveBurn(m) > safeBurn(m) ? `PAST THE LINE (${safeBurn(m)})` : `SAFE TO ${safeBurn(m)}`) },
      { name: 'FUEL', aria: 'Fuel', read: (m) => `${formatNumber(m.fuel)} / ${formatNumber(fuelForLeg(m))}` },
    ],
    extra: [h('div', { class: 'helm-refuel' }, refuel)],
    automation: {
      text: 'WARDEN AUTOPILOT · THE BURN THAT EARNS MOST, NEVER PAST THE STRAIN LINE',
      active: isAutopilotActive,
      handover: {
        available: (m) => {
          const a = autopilot(m);
          return !!a && m.upgrades.includes(a.id);
        },
        onToggle: () => store.dispatch({ type: 'toggleAutopilot' }),
        take: 'Take control from WARDEN',
        give: 'Return control to WARDEN',
      },
    },
    flags: (m) => ({ strain: effectiveBurn(m) > safeBurn(m), dry: m.fuel < fuelForLeg(m) }),
  });

  function render(m: HaulageMission) {
    dial.render(m);
    const need = fuelForLeg(m);
    const docked = isDocked(m);
    const cost = Math.max(0, need - m.fuel) * fuelPrice(m);
    refuel.disabled = cost <= 0 || m.credits <= 0;
    setText(refuel, docked ? `REFUEL FOR THE NEXT LEG ${formatNumber(cost)} CR` : `${words.tender} ${formatNumber(cost)} CR`);
    refuel.setAttribute('aria-label', docked ? 'Refuel for the next leg' : words.tenderAria);
  }

  return { el: dial.el, render };
}
