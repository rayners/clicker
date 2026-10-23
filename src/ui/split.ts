import type { Store } from '../core/store';
import { SECURITY_UPGRADES } from '../data/security/upgrades';
import { assaultForce, force, holdForce, holdNeeded, isTacticalNetActive } from '../mission/security/economy';
import type { SecurityMission } from '../mission/state';
import { formatNumber } from '../engine/format';
import { createDial } from '../engine/ui/dial';

const NET = SECURITY_UPGRADES.find((u) => u.effect.kind === 'tacticalNet')!.id;

/** One tap moves a tenth of the detachment between the assault and the line; WARDEN can take it over. */
export function createSplit(store: Store): { el: HTMLElement; render(m: SecurityMission): void } {
  return createDial<SecurityMission>({
    label: 'Force split',
    value: {
      aria: 'Assault share',
      read: (m) => {
        const total = force(m);
        return `${isTacticalNetActive(m) ? (total > 0 ? Math.round((assaultForce(m) / total) * 100) : 0) : m.assaultShare * 10}%`;
      },
    },
    less: { label: 'More to the line', onPress: () => store.dispatch({ type: 'shiftSplit', step: -1 }) },
    more: { label: 'More to the assault', onPress: () => store.dispatch({ type: 'shiftSplit', step: 1 }) },
    sides: [
      { name: 'ASSAULT', read: (m) => formatNumber(assaultForce(m)) },
      { name: 'LINE', read: (m) => `${formatNumber(Math.min(holdForce(m), holdNeeded(m)))} / ${formatNumber(holdNeeded(m))}` },
    ],
    automation: {
      text: 'WARDEN TACTICAL NET · EXACTLY ENOUGH ON THE LINE, EVERYONE ELSE FORWARD',
      active: isTacticalNetActive,
      handover: { available: (m) => m.upgrades.includes(NET), onToggle: () => store.dispatch({ type: 'toggleTacticalNet' }), take: 'Take control from WARDEN', give: 'Return control to WARDEN' },
    },
    flags: (m) => ({ stretched: holdForce(m) < holdNeeded(m) }),
  });
}
