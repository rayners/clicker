import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { creatureUpgradeCost, isCreatureUpgradeAvailable, CREATURE_ADAPTER, type CreatureHunt } from '../core/creature';
import { CREATURE_UPGRADES } from '../data/creature/upgrades';
import type { CreatureMission, ScenarioId } from '../mission/state';
import { formatNumber } from '../engine/format';
import { createHuntView } from '../engine/ui/hunt-view';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const KIND: Record<ScenarioId, string> = { extraction: 'EXTRACTION', terraform: 'TERRAFORM', security: 'SECURITY', haulage: 'HAULAGE', overland: 'OVERLAND', salvage: 'SALVAGE' };
/** How each WARDEN's thinking reads from inside the walls. */
const ACT_NAMES = ['', 'ROUTINE', 'NOTICED', 'HUNTED', 'VENTED'];
const GUIDE_KEY = 'deep-contract.creature.guide';
const GUIDE = huntGuide<GameState>((g) => (g.mode === 'creature' ? (g.creature?.hunt ?? null) : null), {
  title: 'SPECIAL ORDER 0-77',
  prey: 'ship',
  harvest: 'BIOMASS',
  notoriety: 'WHISPERS',
  root: '.xeno:not([data-horror])',
  push: '[aria-label^="Stalk "][aria-label$=" harder"]',
  rest: 'GO DORMANT',
  growth: 'WHAT IT BECOMES',
});

/** Special Order 0-77, accepted: WARDEN sees the ships from inside the vents, in heat. */
export function createCreatureView(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const hunt = (g: GameState): CreatureHunt | null => (g.mode === 'creature' ? g.creature : null);
  return createHuntView<GameState, CreatureHunt['hunt']['prey'][number]>({
    className: 'xeno',
    label: 'Special Order 0-77',
    title: 'SPECIAL ORDER 0-77',
    hunt: (g) => hunt(g)?.hunt ?? null,
    legend: (g) => g.profile.legend.creature ?? 0,
    back: { text: 'RETURN TO CONTRACT', aria: 'Return to the contract', onPress: () => store.dispatch({ type: 'leaveCreature' }) },
    stats: { harvest: 'BIOMASS', notoriety: 'WHISPERS' },
    note: (h, used) =>
      h.beatenFor > 0
        ? `A WARDEN vented its decks. It lies in the cold of the hull for ${Math.ceil(h.beatenFor / 60)} minutes.`
        : h.dormant
          ? 'DORMANT. IN THE CREW LOUNGES, THE STORIES STOP.'
          : h.hunger <= 0
            ? 'STARVING. IT CANNOT MOVE.'
            : used === 0
              ? 'IT WAITS IN THE VENTS OF THREE SHIPS. CHOOSE ONE.'
              : 'IT IS IN THE WALLS. THE CREWS HEAR SOMETHING.',
    rest: { sleep: 'GO DORMANT', wake: 'WAKE', onToggle: () => store.dispatch({ type: 'toggleCreatureDormant' }) },
    onEnd: () => store.dispatch({ type: 'endCreature' }),
    prey: {
      name: (p) => p.mission.config.shipName.toUpperCase(),
      rows: [
        [
          { className: 'xeno-title', read: (p) => `${p.mission.config.shipName.toUpperCase()} · ${KIND[p.mission.scenario]} #${p.contract}` },
          { className: 'xeno-taken', read: (p) => `${formatNumber((p.mission as CreatureMission).taken)} TAKEN`, aria: (n) => `Taken from ${n}` },
        ],
        [
          { className: 'xeno-act', read: (p) => `WARDEN: ${ACT_NAMES[p.mission.act] ?? 'VENTED'}` },
          { className: 'xeno-suspicion', read: (p) => `SUSPICION ${Math.round(CREATURE_ADAPTER.alarm(p) * 100)}%`, aria: (n) => `Suspicion aboard ${n}` },
        ],
      ],
      alarm: CREATURE_ADAPTER.alarm,
      less: (n) => `Ease off ${n}`,
      more: (n) => `Stalk ${n} harder`,
      onShift: (index, step) => store.dispatch({ type: 'shiftCreaturePush', index, step }),
    },
    upgrades: {
      heading: 'WHAT IT BECOMES',
      items: (g) => {
        const c = hunt(g)!;
        return CREATURE_UPGRADES.filter((u) => isCreatureUpgradeAvailable(c, u.id)).map((u) => ({ ...u, cost: creatureUpgradeCost(c, u.id), bought: c.bought[u.id] ?? 0 }));
      },
      currency: 'BIOMASS',
      verb: 'Evolve',
      onBuy: (id) => store.dispatch({ type: 'buyCreatureUpgrade', id }),
    },
    feed: {
      heading: 'WHAT IT TOOK',
      aria: 'What it took',
      entries: (h) =>
        h.prey.flatMap((p) =>
          p.mission.log.filter((e) => e.kind === 'anomaly').map((e) => ({ key: `${p.mission.seed}:${e.id}`, t: e.t, when: p.mission.config.shipName.toUpperCase(), text: e.text })),
        ),
    },
    guide: createGuideView<GameState>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) }),
  });
}
