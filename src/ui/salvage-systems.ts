import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { CUTTERS, SHORING } from '../data/salvage/systems';
import { cutForce, cutterCost, cutterForce, isCutterRevealed, isShoringRevealed, shoringCost, salvageGain, shoringHold } from '../mission/salvage/economy';
import type { SalvageMission } from '../mission/state';
import { createBuyPanel } from '../engine/ui/buy-list';
import { CREDITS, unitItem } from './buy';

/** The salvage crew: cutters on the frontier, and the shoring that keeps opened compartments open. */
export function createSalvageSystemsPanel(store: Store): { el: HTMLElement; render(m: SalvageMission): void } {
  const shoring = SHORING.map((def, index) =>
    unitItem<SalvageMission>(def, {
      verb: 'Fit',
      owned: (m) => m.shoring[def.id] ?? 0,
      price: (m) => shoringCost(def, m.shoring[def.id] ?? 0),
      each: (m) => `HOLDS ${formatNumber(shoringHold({ ...m, shoring: { [def.id]: 1 } }))} EA`,
      adds: (m) => {
        const hold = salvageGain(m, { shoring: def.id }).hold;
        return hold > 0 ? { text: `+${formatNumber(hold)} HOLD`, wasted: false } : { text: '+0 · BRACED ENOUGH', wasted: true };
      },
      shown: (m) => isShoringRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyShoring', id: def.id }),
    }),
  );
  const cutters = CUTTERS.map((def, index) =>
    unitItem<SalvageMission>(def, {
      verb: 'Hire',
      owned: (m) => m.cutters[def.id] ?? 0,
      price: (m) => cutterCost(def, m.cutters[def.id] ?? 0),
      each: (m) => `${formatNumber(cutterForce(m, def))} CUT EA`,
      adds: (m) => {
        const pay = salvageGain(m, { cutter: def.id }).income;
        return pay > 0 ? { text: `+${formatNumber(pay)} CR/S`, wasted: false } : { text: `+0 · ${m.sealedFor > 0 ? 'BREACH SEALING' : 'NOTHING LEFT TO CUT'}`, wasted: true };
      },
      shown: (m) => isCutterRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyCutter', id: def.id }),
    }),
  );

  return createBuyPanel<SalvageMission>({
    title: 'SALVAGE CREW',
    funds: (m) => m.credits,
    currency: CREDITS,
    sections: [
      { heading: 'SHORING', total: (m) => `HOLDS ${formatNumber(shoringHold(m))}`, items: shoring },
      { heading: 'CUTTING', total: (m) => formatNumber(cutForce(m)), items: cutters },
    ],
  });
}
