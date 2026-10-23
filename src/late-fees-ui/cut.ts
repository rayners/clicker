import { formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { createHuntView } from '../engine/ui/hunt-view';
import { CUT_UPGRADES } from '../late-fees-data/cut-upgrades';
import { CUT_ADAPTER, cutUpgradeCost, isCutUpgradeAvailable, type KillerCut } from '../late-fees/cut';
import type { LateGame } from '../late-fees/game';
import { KILLERS } from '../late-fees/registry';
import type { LateStore } from '../late-fees/store';
import { tapeCounter } from './app';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const ACT_NAMES = ['', 'OPENING KILL', 'BODY COUNT', 'THE FINAL GIRL', 'THE CONFRONTATION'];
const GUIDE_KEY = 'latefees.cut.guide';
const GUIDE = huntGuide<LateGame>((g) => (g.mode === 'cut' ? (g.cut?.hunt ?? null) : null), {
  title: "THE KILLER'S CUT",
  prey: 'place',
  harvest: 'DREAD',
  notoriety: 'NOTORIETY',
  root: '.cut',
  push: '[aria-label^="Push harder at"]',
  rest: 'GO TO GROUND',
  growth: 'WHAT YOU HAVE BECOME',
});

/** Side B: the killer's-eye view. Every place at once, the push split, and what the killer has become. */
export function createCutView(store: LateStore): { el: HTMLElement; render(game: LateGame): void } {
  const cut = (g: LateGame): KillerCut | null => (g.mode === 'cut' ? g.cut : null);
  const counter = h('span', { class: 'osd-counter' }, '0:00:00');
  return createHuntView<LateGame, KillerCut['hunt']['prey'][number]>({
    className: 'cut',
    classes: {
      stats: 'stats',
      stat: 'stat',
      value: 'stat-value',
      label: 'stat-label',
      sub: 'panel-sub',
      feed: 'log cut-feed',
      entry: 'log-entry log-kill',
      when: 'log-time',
      text: 'log-text',
      upgradeList: 'item',
      upgradeRow: 'item',
    },
    label: "The Killer's Cut",
    title: (g) => {
      const c = cut(g)!;
      const carried = g.profile.legend[c.killer] ?? 0;
      return `THE KILLER'S CUT · ${KILLERS[c.killer].name}${carried > 0 ? ` · LEGEND ${carried}` : ''}`;
    },
    header: (title, rules, back) =>
      h(
        'header',
        { class: 'osd' },
        h('div', { class: 'osd-left' }, h('span', { class: 'osd-rec-live' }, '● REC'), title),
        h('div', { class: 'osd-right' }, counter, ...(rules ? [rules] : []), back),
      ),
    onRender: (g) => setText(counter, tapeCounter(Math.max(...cut(g)!.hunt.prey.map((p) => p.run.elapsed)))),
    hunt: (g) => cut(g)?.hunt ?? null,
    back: { text: 'EJECT ⏏', aria: 'Eject: back to the shelf', onPress: () => store.dispatch({ type: 'leaveCut' }) },
    stats: { harvest: 'DREAD', notoriety: 'NOTORIETY' },
    note: (h, used) =>
      h.beatenFor > 0
        ? `PUT DOWN. LYING LOW FOR ${Math.ceil(h.beatenFor / 60)}M. THEY THINK IT'S OVER.`
        : h.dormant
          ? 'GONE TO GROUND. THE STORIES FADE. THE PLACES RELAX.'
          : h.hunger <= 0
            ? 'STARVING. NOTHING MOVES UNTIL YOU FEED.'
            : used === 0
              ? 'WATCHING. PUSH A PLACE TO BEGIN.'
              : `HUNTING ${used} STEP${used === 1 ? '' : 'S'} DEEP.`,
    rest: { sleep: 'GO TO GROUND', wake: 'WAKE', onToggle: () => store.dispatch({ type: 'toggleCutDormant' }) },
    endNoun: 'cut',
    onEnd: () => store.dispatch({ type: 'endCut' }),
    prey: {
      name: (p) => p.run.config.title,
      rows: [
        [
          { className: 'cut-title', read: (p) => p.run.config.title },
          { className: 'cut-dead', read: (p) => `${formatNumber(p.run.bodyCount)} DEAD`, aria: (n) => `Dead at ${n}` },
        ],
        [{ className: 'cut-act', read: (p) => `ACT ${p.run.act}: ${ACT_NAMES[p.run.act] ?? ''}` }],
      ],
      alarm: CUT_ADAPTER.alarm,
      less: (n) => `Ease off ${n}`,
      more: (n) => `Push harder at ${n}`,
      onShift: (index, step) => store.dispatch({ type: 'shiftCutPush', index, step }),
    },
    upgrades: {
      heading: 'WHAT YOU HAVE BECOME',
      items: (g) => {
        const c = cut(g)!;
        return CUT_UPGRADES.filter((u) => isCutUpgradeAvailable(c, u.id)).map((u) => ({ ...u, cost: cutUpgradeCost(c, u.id), bought: c.bought[u.id] ?? 0 }));
      },
      currency: 'DREAD',
      verb: 'Buy',
      onBuy: (id) => store.dispatch({ type: 'buyCutUpgrade', id }),
    },
    // The latest deaths from every place, newest first.
    feed: {
      heading: 'THE BODY COUNT',
      aria: 'Kills',
      entries: (h) => h.prey.flatMap((p) => p.run.log.filter((e) => e.kind === 'kill').map((e) => ({ key: `${p.run.seed}:${e.id}`, t: e.t, when: p.run.config.title, text: e.text }))),
    },
    extra: [h('div', { class: 'vhs-noise', 'aria-hidden': 'true' })],
    guide: createGuideView<LateGame>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) }),
  });
}
