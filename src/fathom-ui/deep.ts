import { formatNumber } from '../engine/format';
import { createHuntView } from '../engine/ui/hunt-view';
import { DEEP_UPGRADES } from '../fathom-data/deep-upgrades';
import { DEEP_ADAPTER, deepUpgradeCost, isDeepUpgradeAvailable, type DeepHunt } from '../fathom/deep';
import type { FathomGame } from '../fathom/game';
import type { FathomStore } from '../fathom/store';
import { seasonClock } from './app';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const ACT_NAMES = ['', 'THE SEASON', 'SIGHTINGS', 'THE SOURCE', 'LANDFALL'];
const GUIDE_KEY = 'fathom.deep.guide';
const GUIDE = huntGuide<FathomGame>((g) => (g.mode === 'deep' ? (g.deep?.hunt ?? null) : null), {
  title: 'THE SOURCE',
  prey: 'town',
  harvest: 'THE DROWNED',
  notoriety: 'SIGHTINGS',
  root: '.deep',
  push: '[aria-label^="Rise under"]',
  rest: 'SINK',
  growth: 'WHAT THE SOURCE BECOMES',
});

/** The sonar turned around: the towns as the thing behind the seam hears them. */
export function createDeepView(store: FathomStore): { el: HTMLElement; render(game: FathomGame): void } {
  const deep = (g: FathomGame): DeepHunt | null => (g.mode === 'deep' ? g.deep : null);
  return createHuntView<FathomGame, DeepHunt['hunt']['prey'][number]>({
    className: 'deep',
    classes: { stats: 'stats', stat: 'stat', value: 'stat-value', label: 'stat-label', sub: 'panel-sub' },
    label: 'The Source',
    title: 'THE SOURCE',
    hunt: (g) => deep(g)?.hunt ?? null,
    legend: (g) => g.profile.legend.deep ?? 0,
    back: { text: 'RETURN TO THE SURFACE', aria: 'Return to the surface', onPress: () => store.dispatch({ type: 'leaveDeep' }) },
    stats: { harvest: 'THE DROWNED', notoriety: 'SIGHTINGS' },
    note: (h, used) =>
      h.beatenFor > 0
        ? `A town closed the seam. The Source sinks back for ${Math.ceil(h.beatenFor / 60)} minutes.`
        : h.dormant
          ? 'THE SOURCE LIES DEEP. ON THE COAST, THE SIGHTINGS STOP MAKING THE PAPERS.'
          : h.hunger <= 0
            ? 'THE SOURCE IS STARVING. NOTHING MOVES BELOW THE THERMOCLINE.'
            : used === 0
              ? 'THE SOURCE LISTENS TO THE TOWNS ON THE SURFACE. RISE UNDER ONE.'
              : `THE SOURCE RISES UNDER ${used === 1 ? 'ONE TOWN' : 'THE TOWNS'}. THE WATER IS COLDER THERE.`,
    rest: { sleep: 'SINK', wake: 'RISE', onToggle: () => store.dispatch({ type: 'toggleDeepDormant' }) },
    onEnd: () => store.dispatch({ type: 'endDeep' }),
    prey: {
      name: (p) => p.town,
      rows: [
        [
          { className: 'deep-title', read: (p) => `${p.town} · SEASON ${p.outfit.terms.season}` },
          { className: 'deep-drowned', read: (p) => `${formatNumber(p.outfit.bodyCount)} DROWNED`, aria: (n) => `Drowned at ${n}` },
        ],
        [
          { className: 'deep-act', read: (p) => `ACT ${p.outfit.act}: ${ACT_NAMES[p.outfit.act] ?? ''}` },
          {
            className: 'deep-coast',
            read: (p) => {
              const cities = p.outfit.cities;
              return cities.length === 0 ? 'THE COAST IS QUIET' : `${cities.filter((c) => !c.secured).length} OF ${cities.length} CITIES FALLEN`;
            },
          },
        ],
      ],
      alarm: DEEP_ADAPTER.alarm,
      less: (n) => `Sink away from ${n}`,
      more: (n) => `Rise under ${n}`,
      onShift: (index, step) => store.dispatch({ type: 'shiftDeepPush', index, step }),
    },
    upgrades: {
      heading: 'WHAT THE SOURCE BECOMES',
      items: (g) => {
        const d = deep(g)!;
        return DEEP_UPGRADES.filter((u) => isDeepUpgradeAvailable(d, u.id)).map((u) => ({ ...u, cost: deepUpgradeCost(d, u.id), bought: d.bought[u.id] ?? 0 }));
      },
      currency: 'DROWNED',
      verb: 'Grow',
      onBuy: (id) => store.dispatch({ type: 'buyDeepUpgrade', id }),
    },
    feed: {
      heading: 'WHAT THE SOURCE TOOK',
      aria: 'What the Source took',
      entries: (h) => h.prey.flatMap((p) => p.outfit.log.filter((e) => e.kind === 'attack').map((e) => ({ key: `${p.outfit.seed}:${e.id}`, t: e.t, when: `${seasonClock(e.t)} · ${p.town}`, text: e.text }))),
    },
    guide: createGuideView<FathomGame>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) }),
  });
}
