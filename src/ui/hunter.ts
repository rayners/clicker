import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { hunterUpgradeCost, isHunterUpgradeAvailable, HUNTER_ADAPTER, type HunterHunt } from '../core/hunter';
import { HUNTER_UPGRADES } from '../data/hunter/upgrades';
import type { HunterMission, ScenarioId } from '../mission/state';
import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createConfirmButton } from '../engine/ui/confirm';
import { legendEarned } from '../engine/hunt';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const KIND: Record<ScenarioId, string> = { extraction: 'EXTRACTION', terraform: 'TERRAFORM', security: 'SECURITY', haulage: 'HAULAGE', overland: 'OVERLAND', salvage: 'SALVAGE' };
/** How each crew reads to the hunter, act by act. */
const ACT_NAMES = ['', 'UNAWARE', 'ARMED', 'HUNTING YOU', 'DROVE YOU OFF'];
const FEED = 8;
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

function createCrewStrip(store: Store, index: number) {
  const title = h('span', { class: 'xeno-title' });
  const act = h('span', { class: 'xeno-act' });
  const trophies = h('span', { class: 'xeno-taken' });
  const alert = h('span', { class: 'xeno-suspicion' });
  const fill = h('i', { class: 'xeno-alarm-fill' });
  const push = h('span', { class: 'xeno-push' }, '0');
  const less = h('button', { class: 'xeno-step', type: 'button' }, '−');
  const more = h('button', { class: 'xeno-step', type: 'button' }, '+');
  less.addEventListener('click', () => store.dispatch({ type: 'shiftHunterPush', index, step: -1 }));
  more.addEventListener('click', () => store.dispatch({ type: 'shiftHunterPush', index, step: 1 }));
  const el = h(
    'section',
    { class: 'xeno-ship', role: 'group' },
    h('div', { class: 'xeno-row' }, title, trophies),
    h('div', { class: 'xeno-row' }, act, alert),
    h('span', { class: 'xeno-alarm', 'aria-hidden': 'true' }, fill),
    h('div', { class: 'xeno-steps' }, less, push, more),
  );
  let named = '';
  return {
    el,
    render(hunt: HunterHunt) {
      const prey = hunt.hunt.prey[index]!;
      const m = prey.mission as HunterMission;
      const name = m.config.shipName.toUpperCase();
      if (name !== named) {
        named = name;
        setAttr(el, 'aria-label', name);
        setAttr(trophies, 'aria-label', `Trophies from ${name}`);
        setAttr(alert, 'aria-label', `Alert aboard ${name}`);
        setAttr(less, 'aria-label', `Fall back from ${name}`);
        setAttr(more, 'aria-label', `Stalk ${name} closer`);
      }
      setText(title, `${name} · ${KIND[m.scenario]} #${prey.contract}`);
      setText(act, `CREW: ${ACT_NAMES[m.act] ?? 'DROVE YOU OFF'}`);
      setText(trophies, `${formatNumber(m.trophies)} TROPHIES`);
      const alarm = HUNTER_ADAPTER.alarm(prey);
      setText(alert, `ALERT ${Math.round(alarm * 100)}%`);
      fill.style.width = `${Math.round(alarm * 100)}%`;
      const steps = hunt.hunt.split[index] ?? 0;
      setText(push, String(steps));
      el.dataset.pushed = String(steps > 0);
      el.dataset.wary = String(alarm >= 0.75);
    },
  };
}

/** The hunt, accepted: the crews through the cloak, in thermal blue. */
export function createHunterView(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const back = h('button', { class: 'xeno-back', type: 'button', 'aria-label': 'Return to the contract' }, 'RETURN TO CONTRACT');
  back.addEventListener('click', () => store.dispatch({ type: 'leaveHunter' }));
  const guide = createGuideView<GameState>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const name = h('h2', { class: 'xeno-name' }, 'THE HUNT');
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'xeno-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'xeno-stat' }, h('dt', {}, label), value) };
  };
  const trophies = stat('TROPHIES', 'Trophies');
  const hunger = stat('HUNGER', 'Hunger');
  const stories = stat('STORIES', 'Stories');
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: 'xeno-note' });
  // Ending the hunt is for good, so it takes a second tap.
  const end = createConfirmButton({ className: 'xeno-sleep xeno-end', onConfirm: () => store.dispatch({ type: 'endHunter' }) });
  const withdraw = h('button', { class: 'xeno-sleep', type: 'button' });
  withdraw.addEventListener('click', () => store.dispatch({ type: 'toggleHunterDormant' }));
  const crews = [0, 1, 2].map((i) => createCrewStrip(store, i));
  const upgrades = h('ul', { class: 'xeno-upgrades' });
  const feed = h('ol', { class: 'xeno-feed', 'aria-label': 'What the hunter took' });
  const el = h(
    'section',
    { class: 'xeno', 'data-horror': 'hunter', 'aria-label': 'The hunt', hidden: true },
    h('header', { class: 'xeno-head' }, name, guide.rulesButton, back),
    h(
      'div',
      { class: 'xeno-body' },
      h(
        'div',
        { class: 'xeno-col' },
        guide.el,
        h('dl', { class: 'xeno-stats' }, trophies.el, hunger.el, stories.el, free.el),
        note,
        ...crews.map((c) => c.el),
        withdraw,
        end.el,
        h('h3', { class: 'xeno-sub' }, 'TROPHIES TAKEN'),
        feed,
      ),
      h('div', { class: 'xeno-col' }, h('h3', { class: 'xeno-sub' }, 'WHAT IT CARRIES'), upgrades),
    ),
    guide.rulesDialog,
  );
  let shownUpgrades = '';
  let shownFeed = '';

  function render(game: GameState) {
    el.hidden = game.mode !== 'hunter' || !game.hunter;
    const c = game.hunter;
    if (el.hidden || !c) return guide.render(game);
    const hunt = c.hunt;
    setText(trophies.value, formatNumber(hunt.dread));
    setText(hunger.value, `${Math.round(hunt.hunger)}%`);
    setText(stories.value, hunt.notoriety.toFixed(2));
    const used = hunt.split.reduce((a, b) => a + b, 0);
    setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
    setText(
      note,
      hunt.beatenFor > 0
        ? `A CREW DROVE IT OFF. IT WAITS IN ITS SHIP FOR ${Math.ceil(hunt.beatenFor / 60)} MINUTES, AND REMEMBERS THEIR FACES.`
        : hunt.dormant
          ? 'WITHDRAWN. THE CREWS STOP SLEEPING WITH THEIR RIFLES.'
          : hunt.hunger <= 0
            ? 'IT HAS NO STOMACH FOR THE HUNT. IT WAITS.'
            : used === 0
              ? 'THREE CREWS. NONE OF THEM KNOWS YET. LET ONE SEE YOU.'
              : 'A CREW THAT HAS NOT SEEN IT COMING IS NO TROPHY. LET THEM ARM, THEN TAKE THEM.',
    );
    el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
    setText(withdraw, hunt.dormant ? 'RETURN TO THE HUNT' : 'WITHDRAW');
    setAttr(withdraw, 'aria-label', hunt.dormant ? 'Return to the hunt' : 'Withdraw');
    const carried = game.profile.legend.hunter ?? 0;
    setText(name, carried > 0 ? `THE HUNT · LEGEND ${carried}` : 'THE HUNT');
    const earned = legendEarned(hunt.harvest);
    end.label(`End the hunt for ${earned} Legend`, `END THE HUNT · +${earned} LEGEND`);
    for (const s of crews) s.render(c);

    const key = HUNTER_UPGRADES.map((u) => `${u.id}:${c.bought[u.id] ?? 0}`).join(',');
    if (key !== shownUpgrades) {
      shownUpgrades = key;
      upgrades.replaceChildren(
        ...HUNTER_UPGRADES.filter((u) => isHunterUpgradeAvailable(c, u.id)).map((u) => {
          const cost = hunterUpgradeCost(c, u.id);
          const take = h('button', { class: 'buy', type: 'button', 'data-cost': cost, 'aria-label': `Take ${u.name} for ${formatNumber(cost)} trophies` }, `${formatNumber(cost)} TROPHIES`);
          take.addEventListener('click', () => store.dispatch({ type: 'buyHunterUpgrade', id: u.id }));
          const times = c.bought[u.id] ?? 0;
          return h('li', { class: 'xeno-upgrade' }, h('div', { class: 'xeno-row' }, h('span', {}, u.name), h('span', {}, times ? `×${times}` : '')), h('p', { class: 'xeno-desc' }, u.description), take);
        }),
      );
    }
    for (const b of upgrades.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = hunt.dread < Number(b.dataset.cost);

    const entries = hunt.prey
      .flatMap((p) =>
        p.mission.log
          .filter((e) => e.kind === 'anomaly')
          .map((e) => ({ who: p.mission.config.shipName.toUpperCase(), t: e.t, text: e.text, key: `${p.mission.seed}:${e.id}` })),
      )
      .sort((a, b) => b.t - a.t)
      .slice(0, FEED);
    const feedKey = entries.map((e) => e.key).join(',');
    if (feedKey !== shownFeed) {
      shownFeed = feedKey;
      feed.replaceChildren(...entries.map((e) => h('li', { class: 'xeno-entry' }, h('span', { class: 'xeno-when' }, e.who), ' ', e.text)));
    }
    // Last, so the controls it points at are labelled.
    guide.render(game);
  }

  return { el, render };
}
