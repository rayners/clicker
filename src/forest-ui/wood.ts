import { formatNumber } from '../engine/format';
import { WOOD_UPGRADES } from '../forest-data/wood-upgrades';
import { isWoodUpgradeAvailable, woodUpgradeCost, WOOD_ADAPTER, type WoodHunt } from '../forest/wood';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { createLedgerHunt } from './hunt';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const GUIDE_KEY = 'elderdark.wood.guide';
const GUIDE = huntGuide<ForestGame>((g) => (g.mode === 'wood' ? (g.wood?.hunt ?? null) : null), {
  title: 'THE WOOD',
  prey: 'company',
  harvest: 'SAP',
  notoriety: 'FEAR',
  root: '.wood:not(.dragon)',
  push: '[aria-label^="Lean harder on"]',
  rest: 'SLEEP',
  growth: 'WHAT THE WOOD BECOMES',
});

/** The ledger turned over: the wood's own account, in a hand nobody at Thistlegate wrote. */
export function createWoodView(store: ForestStore): { el: HTMLElement; render(game: ForestGame): void } {
  const wood = (g: ForestGame): WoodHunt | null => (g.mode === 'wood' ? g.wood : null);
  return createLedgerHunt<WoodHunt['hunt']['prey'][number]>({
    label: 'The wood',
    title: 'The Wood Listens',
    hunt: (g) => wood(g)?.hunt ?? null,
    legend: (g) => g.profile.legend.wood ?? 0,
    onBack: () => store.dispatch({ type: 'leaveWood' }),
    stats: { harvest: 'SAP', notoriety: 'FEAR' },
    note: (h, used) =>
      h.beatenFor > 0
        ? `A charter ended and the Synod burned the eaves. The wood draws back for ${Math.ceil(h.beatenFor / 60)} minutes.`
        : h.dormant
          ? 'The wood sleeps. In the town, they begin to forget.'
          : h.hunger <= 0
            ? 'The wood is starving. Nothing moves under the trees.'
            : used === 0
              ? 'The wood watches the companies come and go. Lean on one.'
              : `The wood leans on ${used === 1 ? 'one company' : 'the companies'}. The paths are closing.`,
    rest: { sleep: 'SLEEP', wake: 'WAKE', onToggle: () => store.dispatch({ type: 'toggleWoodDormant' }) },
    onEnd: () => store.dispatch({ type: 'endWood' }),
    cells: [
      { className: 'wood-lost', read: (p) => `${formatNumber(p.company.lifetimeDead + p.company.turned)} HANDS TAKEN`, aria: (n) => `Hands lost by ${n}` },
      { className: 'wood-blight', read: (p) => `BLIGHT ${Math.round(p.company.blight)}%`, aria: (n) => `Blight in ${n}` },
    ],
    alarm: WOOD_ADAPTER.alarm,
    less: (n) => `Ease off ${n}`,
    more: (n) => `Lean harder on ${n}`,
    onShift: (index, step) => store.dispatch({ type: 'shiftWoodPush', index, step }),
    upgrades: {
      heading: 'WHAT THE WOOD BECOMES',
      items: (g) => {
        const w = wood(g)!;
        return WOOD_UPGRADES.filter((u) => isWoodUpgradeAvailable(w, u.id)).map((u) => ({ ...u, cost: woodUpgradeCost(w, u.id), bought: w.bought[u.id] ?? 0 }));
      },
      currency: 'SAP',
      verb: 'Grow',
      onBuy: (id) => store.dispatch({ type: 'buyWoodUpgrade', id }),
    },
    feed: { heading: 'WHAT THE WOOD TOOK', aria: 'What the wood took', took: (_text, kind) => kind === 'omen' || kind === 'hand' },
    guide: createGuideView<ForestGame>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) }),
  });
}
