import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { hunterUpgradeCost, isHunterUpgradeAvailable, HUNTER_ADAPTER, type HunterHunt } from '../core/hunter';
import { HUNTER_UPGRADES } from '../data/hunter/upgrades';
import type { HunterMission, ScenarioId } from '../mission/state';
import { formatNumber } from '../engine/format';
import { createHuntView } from '../engine/ui/hunt-view';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const KIND: Record<ScenarioId, string> = { extraction: 'EXTRACTION', terraform: 'TERRAFORM', security: 'SECURITY', haulage: 'HAULAGE', overland: 'OVERLAND', salvage: 'SALVAGE' };
/** How each crew reads to the hunter, act by act. */
const ACT_NAMES = ['', 'UNAWARE', 'ARMED', 'HUNTING YOU', 'DROVE YOU OFF'];
const GUIDE_KEY = 'deep-contract.hunter.guide';
const GUIDE = huntGuide<GameState>((g) => (g.mode === 'hunter' ? (g.hunter?.hunt ?? null) : null), {
  title: 'THE HUNT',
  prey: 'ship',
  harvest: 'TROPHIES',
  notoriety: 'STORIES',
  root: '.xeno[data-horror="hunter"]',
  push: '[aria-label^="Stalk "][aria-label$=" closer"]',
  rest: 'WITHDRAW',
  growth: 'WHAT IT CARRIES',
});

/** The hunt, accepted: the crews through the cloak, in thermal blue. */
export function createHunterView(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const hunt = (g: GameState): HunterHunt | null => (g.mode === 'hunter' ? g.hunter : null);
  return createHuntView<GameState, HunterHunt['hunt']['prey'][number]>({
    className: 'xeno',
    attrs: { 'data-horror': 'hunter' },
    label: 'The hunt',
    title: 'THE HUNT',
    hunt: (g) => hunt(g)?.hunt ?? null,
    legend: (g) => g.profile.legend.hunter ?? 0,
    back: { text: 'RETURN TO CONTRACT', aria: 'Return to the contract', onPress: () => store.dispatch({ type: 'leaveHunter' }) },
    stats: { harvest: 'TROPHIES', notoriety: 'STORIES' },
    note: (h, used) =>
      h.beatenFor > 0
        ? `A CREW DROVE IT OFF. IT WAITS IN ITS SHIP FOR ${Math.ceil(h.beatenFor / 60)} MINUTES, AND REMEMBERS THEIR FACES.`
        : h.dormant
          ? 'WITHDRAWN. THE CREWS STOP SLEEPING WITH THEIR RIFLES.'
          : h.hunger <= 0
            ? 'IT HAS NO STOMACH FOR THE HUNT. IT WAITS.'
            : used === 0
              ? 'THREE CREWS. NONE OF THEM KNOWS YET. LET ONE SEE YOU.'
              : 'A CREW THAT HAS NOT SEEN IT COMING IS NO TROPHY. LET THEM ARM, THEN TAKE THEM.',
    rest: { sleep: 'WITHDRAW', wake: 'RETURN TO THE HUNT', onToggle: () => store.dispatch({ type: 'toggleHunterDormant' }) },
    onEnd: () => store.dispatch({ type: 'endHunter' }),
    prey: {
      name: (p) => p.mission.config.shipName.toUpperCase(),
      rows: [
        [
          { className: 'xeno-title', read: (p) => `${p.mission.config.shipName.toUpperCase()} · ${KIND[p.mission.scenario]} #${p.contract}` },
          { className: 'xeno-taken', read: (p) => `${formatNumber((p.mission as HunterMission).trophies)} TROPHIES`, aria: (n) => `Trophies from ${n}` },
        ],
        [
          { className: 'xeno-act', read: (p) => `CREW: ${ACT_NAMES[p.mission.act] ?? 'DROVE YOU OFF'}` },
          { className: 'xeno-suspicion', read: (p) => `ALERT ${Math.round(HUNTER_ADAPTER.alarm(p) * 100)}%`, aria: (n) => `Alert aboard ${n}` },
        ],
      ],
      alarm: HUNTER_ADAPTER.alarm,
      less: (n) => `Fall back from ${n}`,
      more: (n) => `Stalk ${n} closer`,
      onShift: (index, step) => store.dispatch({ type: 'shiftHunterPush', index, step }),
    },
    upgrades: {
      heading: 'WHAT IT CARRIES',
      items: (g) => {
        const c = hunt(g)!;
        return HUNTER_UPGRADES.filter((u) => isHunterUpgradeAvailable(c, u.id)).map((u) => ({ ...u, cost: hunterUpgradeCost(c, u.id), bought: c.bought[u.id] ?? 0 }));
      },
      currency: 'TROPHIES',
      verb: 'Take',
      onBuy: (id) => store.dispatch({ type: 'buyHunterUpgrade', id }),
    },
    feed: {
      heading: 'TROPHIES TAKEN',
      aria: 'What the hunter took',
      entries: (h) =>
        h.prey.flatMap((p) =>
          p.mission.log.filter((e) => e.kind === 'anomaly').map((e) => ({ key: `${p.mission.seed}:${e.id}`, t: e.t, when: p.mission.config.shipName.toUpperCase(), text: e.text })),
        ),
    },
    guide: createGuideView<GameState>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) }),
  });
}
