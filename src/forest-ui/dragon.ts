import { formatNumber } from '../engine/format';
import { DRAGON_UPGRADES } from '../forest-data/dragon-upgrades';
import { DRAGON_ADAPTER, dragonUpgradeCost, isDragonUpgradeAvailable, type DragonHunt } from '../forest/dragon';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { createLedgerHunt } from './hunt';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const GUIDE_KEY = 'elderdark.dragon.guide';
const GUIDE = huntGuide<ForestGame>((g) => (g.mode === 'dragon' ? (g.dragon?.hunt ?? null) : null), {
  title: 'THE DRAGON',
  prey: 'company',
  harvest: 'HOARD',
  notoriety: 'SLAYERS',
  root: '.dragon',
  push: '[aria-label^="Circle closer over"]',
  rest: 'SLEEP ON THE HOARD',
  growth: 'WHAT THE DRAGON BECOMES',
});

/** The ledger as the dragon keeps it: an inventory of the hoard, in gold on soot. */
export function createDragonView(store: ForestStore): { el: HTMLElement; render(game: ForestGame): void } {
  const dragon = (g: ForestGame): DragonHunt | null => (g.mode === 'dragon' ? g.dragon : null);
  return createLedgerHunt<DragonHunt['hunt']['prey'][number]>({
    label: 'The hoard',
    title: 'The Hoard',
    variant: 'dragon',
    hunt: (g) => dragon(g)?.hunt ?? null,
    legend: (g) => g.profile.legend.dragon ?? 0,
    onBack: () => store.dispatch({ type: 'leaveDragon' }),
    stats: { harvest: 'HOARD', notoriety: 'SLAYERS' },
    note: (h, used) =>
      h.beatenFor > 0
        ? `A charter came to its reckoning, and the town rang every bell it had. The dragon keeps to its lair for ${Math.ceil(h.beatenFor / 60)} minutes.`
        : h.dormant
          ? 'The dragon sleeps on its hoard. The slayers drink in the town, and grow bored, and leave.'
          : h.hunger <= 0
            ? 'The dragon is too hungry to fly.'
            : used === 0
              ? 'Three companies, three vaults filling. Choose one to circle.'
              : `The dragon circles ${used === 1 ? 'one company' : 'the companies'}. The vault guards look up a great deal.`,
    rest: { sleep: 'SLEEP ON THE HOARD', wake: 'WAKE', onToggle: () => store.dispatch({ type: 'toggleDragonDormant' }) },
    onEnd: () => store.dispatch({ type: 'endDragon' }),
    cells: [
      { className: 'wood-lost', read: (p) => `VAULT ${formatNumber(p.company.relics)}`, aria: (n) => `Vault of ${n}` },
      { className: 'wood-blight', read: (p) => `${p.raids} RAIDS`, aria: (n) => `Raids on ${n}` },
    ],
    alarm: DRAGON_ADAPTER.alarm,
    less: (n) => `Turn away from ${n}`,
    more: (n) => `Circle closer over ${n}`,
    onShift: (index, step) => store.dispatch({ type: 'shiftDragonPush', index, step }),
    upgrades: {
      heading: 'WHAT THE DRAGON BECOMES',
      items: (g) => {
        const d = dragon(g)!;
        return DRAGON_UPGRADES.filter((u) => isDragonUpgradeAvailable(d, u.id)).map((u) => ({ ...u, cost: dragonUpgradeCost(d, u.id), bought: d.bought[u.id] ?? 0 }));
      },
      currency: 'HOARD',
      verb: 'Grow',
      onBuy: (id) => store.dispatch({ type: 'buyDragonUpgrade', id }),
    },
    feed: { heading: 'WHAT THE DRAGON TOOK', aria: 'What the dragon took', took: (text) => /WINGS OVER THE VAULT/.test(text) },
    guide: createGuideView<ForestGame>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) }),
  });
}
