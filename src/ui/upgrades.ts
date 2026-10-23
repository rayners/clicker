import type { Store } from '../core/store';
import type { MissionState } from '../mission/state';
import { createShop, type ShopUpgrade } from '../engine/ui/shop';
import { CREDITS } from './buy';

/** A scenario's upgrade table and which entries are on offer right now. */
export interface UpgradeCatalogue<M extends MissionState> {
  all: readonly ShopUpgrade[];
  available(m: M): readonly ShopUpgrade[];
}

export function createUpgradesPanel<M extends MissionState>(store: Store, catalogue: UpgradeCatalogue<M>): { el: HTMLElement; render(m: M): void; hasAny(m: M): boolean } {
  return createShop<M, ShopUpgrade>({
    title: 'REQUISITIONS',
    all: catalogue.all,
    available: catalogue.available,
    owned: (m) => m.upgrades,
    funds: (m) => m.credits,
    currency: CREDITS,
    ariaVerb: 'Purchase',
    onBuy: (id) => store.dispatch({ type: 'buyUpgrade', id }),
    boughtHeading: (n) => `INSTALLED (${n})`,
    boughtLine: (u) => `■ ${u.name}`,
    boughtClass: 'upg-installed',
  });
}
