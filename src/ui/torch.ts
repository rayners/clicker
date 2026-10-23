import type { Store } from '../core/store';
import { SALVAGE_UPGRADES } from '../data/salvage/upgrades';
import { effectiveNotch, isGovernorActive, isSealed, safeLine } from '../mission/salvage/economy';
import type { SalvageMission } from '../mission/state';
import { createDial } from '../engine/ui/dial';

const GOVERNOR = SALVAGE_UPGRADES.find((u) => u.effect.kind === 'governor')!.id;

/** The torch dial and the hull's stress gauge: one notch per tap, and WARDEN's hull governor. */
export function createTorch(store: Store): { el: HTMLElement; render(m: SalvageMission): void } {
  return createDial<SalvageMission>({
    label: 'Cutting torch',
    className: 'torch',
    value: { aria: 'Torch notch', read: (m) => String(effectiveNotch(m)) },
    less: { label: 'Cooler torch', onPress: () => store.dispatch({ type: 'shiftNotch', step: -1 }) },
    more: { label: 'Hotter torch', onPress: () => store.dispatch({ type: 'shiftNotch', step: 1 }) },
    sides: [
      {
        name: 'TORCH',
        read: (m) => (isSealed(m) ? `SEALED ${Math.ceil(m.sealedFor)} S` : effectiveNotch(m) > safeLine(m) ? `PAST THE LINE (${safeLine(m)})` : `SAFE TO ${safeLine(m)}`),
      },
      { name: 'STRESS', aria: 'Hull stress', read: (m) => `${Math.round(m.stress * 100)}%` },
    ],
    meter: { read: (m) => m.stress },
    automation: {
      text: 'WARDEN HULL GOVERNOR · AS HOT AS THE HULL ALLOWS, BACKING OFF BEFORE A BREACH',
      active: isGovernorActive,
      handover: { available: (m) => m.upgrades.includes(GOVERNOR), onToggle: () => store.dispatch({ type: 'toggleGovernor' }), take: 'Take control from WARDEN', give: 'Return control to WARDEN' },
    },
    flags: (m) => ({ strain: effectiveNotch(m) > safeLine(m), danger: m.stress >= 0.75 }),
  });
}
