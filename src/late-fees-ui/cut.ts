import { formatNumber } from '../shared/format';
import { createConfirmButton } from '../shared/ui/confirm';
import { legendEarned } from '../shared/hunt';
import { h, setAttr, setText } from '../shared/ui/dom';
import { CUT_UPGRADES } from '../late-fees-data/cut-upgrades';
import { CUT_ADAPTER, cutUpgradeCost, isCutUpgradeAvailable, type KillerCut } from '../late-fees/cut';
import type { LateGame } from '../late-fees/game';
import { KILLERS } from '../late-fees/registry';
import type { LateStore } from '../late-fees/store';
import { tapeCounter } from './app';
import { createGuideView } from '../shared/ui/guide';
import { createGuideProgress } from '../shared/guide';
import { huntGuide } from '../shared/hunt-guide';

const ACT_NAMES = ['', 'OPENING KILL', 'BODY COUNT', 'THE FINAL GIRL', 'THE CONFRONTATION'];
const FEED = 8;
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

/** One haunted place: its film, how far it has got, what it knows, its dead, and how hard the killer pushes there. */
function createPlace(store: LateStore, index: number) {
  const title = h('span', { class: 'cut-title' });
  const act = h('span', { class: 'cut-act' });
  const dead = h('span', { class: 'cut-dead' });
  const alarmFill = h('i', { class: 'cut-alarm-fill' });
  const push = h('span', { class: 'split-share' }, '0');
  const less = h('button', { class: 'split-step', type: 'button' }, '−');
  const more = h('button', { class: 'split-step', type: 'button' }, '+');
  less.addEventListener('click', () => store.dispatch({ type: 'shiftCutPush', index, step: -1 }));
  more.addEventListener('click', () => store.dispatch({ type: 'shiftCutPush', index, step: 1 }));
  const el = h(
    'section',
    { class: 'cut-place', role: 'group' },
    h('div', { class: 'cut-place-head' }, title, dead),
    h('div', { class: 'cut-place-mid' }, act, h('span', { class: 'cut-alarm', 'aria-hidden': 'true' }, alarmFill)),
    h('div', { class: 'split-steps cut-steps' }, less, push, more),
  );
  let named = '';
  return {
    el,
    render(cut: KillerCut) {
      const prey = cut.hunt.prey[index]!;
      const r = prey.run;
      const name = r.config.title;
      if (name !== named) {
        named = name;
        setText(title, name);
        setAttr(el, 'aria-label', name);
        setAttr(less, 'aria-label', `Ease off ${name}`);
        setAttr(more, 'aria-label', `Push harder at ${name}`);
        setAttr(dead, 'aria-label', `Dead at ${name}`);
      }
      setText(act, `ACT ${r.act}: ${ACT_NAMES[r.act] ?? ''}`);
      setText(dead, `${formatNumber(r.bodyCount)} DEAD`);
      alarmFill.style.width = `${Math.round(CUT_ADAPTER.alarm(prey) * 100)}%`;
      setText(push, String(cut.hunt.split[index] ?? 0));
      el.dataset.pushed = String((cut.hunt.split[index] ?? 0) > 0);
    },
  };
}

/** Side B: the killer's-eye view. Every place at once, the push split, and what the killer has become. */
export function createCutView(store: LateStore): { el: HTMLElement; render(game: LateGame): void } {
  const killer = h('span', { class: 'osd-title' });
  const counter = h('span', { class: 'osd-counter' }, '0:00:00');
  const eject = h('button', { class: 'setup-open', type: 'button', 'aria-label': 'Eject: back to the shelf' }, 'EJECT ⏏');
  eject.addEventListener('click', () => store.dispatch({ type: 'leaveCut' }));
  const guide = createGuideView<LateGame>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
  };
  const dread = stat('DREAD', 'Dread');
  const hunger = stat('HUNGER', 'Hunger');
  const notoriety = stat('NOTORIETY', 'Notoriety');
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: 'cut-note' });
  // Ending the cut is for good, so it takes a second tap.
  const end = createConfirmButton({ className: 'split-handover cut-end', onConfirm: () => store.dispatch({ type: 'endCut' }) });
  const sleep = h('button', { class: 'split-handover', type: 'button' });
  sleep.addEventListener('click', () => store.dispatch({ type: 'toggleCutDormant' }));
  const places = [0, 1, 2].map((i) => createPlace(store, i));
  const feed = h('ol', { class: 'log cut-feed', 'aria-label': 'Kills' });
  const upgrades = h('ul', { class: 'item-list' });
  const el = h(
    'section',
    { class: 'cut', 'aria-label': "The Killer's Cut", hidden: true },
    h(
      'header',
      { class: 'osd' },
      h('div', { class: 'osd-left' }, h('span', { class: 'osd-rec-live' }, '● REC'), killer),
      h('div', { class: 'osd-right' }, counter, guide.rulesButton, eject),
    ),
    h(
      'div',
      { class: 'cut-body' },
      h(
        'div',
        { class: 'cut-col' },
        guide.el,
        h('dl', { class: 'stats' }, dread.el, hunger.el, notoriety.el, free.el),
        note,
        h('div', { class: 'cut-places' }, ...places.map((p) => p.el)),
        sleep,
        end.el,
        h('h3', { class: 'panel-sub' }, 'THE BODY COUNT'),
        feed,
      ),
      h('div', { class: 'cut-col' }, h('h3', { class: 'panel-sub' }, 'WHAT YOU HAVE BECOME'), upgrades),
    ),
    h('div', { class: 'vhs-noise', 'aria-hidden': 'true' }),
    guide.rulesDialog,
  );
  let shownUpgrades = '';
  let shownFeed = '';

  function render(game: LateGame) {
    el.hidden = game.mode !== 'cut' || !game.cut;
    const cut = game.cut;
    if (el.hidden || !cut) return guide.render(game);
    const hunt = cut.hunt;
    const carried = game.profile.legend[cut.killer] ?? 0;
    setText(killer, `THE KILLER'S CUT · ${KILLERS[cut.killer].name}${carried > 0 ? ` · LEGEND ${carried}` : ''}`);
    const earned = legendEarned(hunt.harvest);
    end.label(`End the cut for ${earned} Legend`, `END THE CUT · +${earned} LEGEND`);
    setText(counter, tapeCounter(Math.max(...hunt.prey.map((p) => p.run.elapsed))));
    setText(dread.value, formatNumber(hunt.dread));
    setText(hunger.value, `${Math.round(hunt.hunger)}%`);
    setText(notoriety.value, hunt.notoriety.toFixed(2));
    const used = hunt.split.reduce((a, b) => a + b, 0);
    setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
    const status = hunt.beatenFor > 0
      ? `PUT DOWN. LYING LOW FOR ${Math.ceil(hunt.beatenFor / 60)}M. THEY THINK IT'S OVER.`
      : hunt.dormant
        ? 'GONE TO GROUND. THE STORIES FADE. THE PLACES RELAX.'
        : hunt.hunger <= 0
          ? 'STARVING. NOTHING MOVES UNTIL YOU FEED.'
          : used === 0
            ? 'WATCHING. PUSH A PLACE TO BEGIN.'
            : `HUNTING ${used} STEP${used === 1 ? '' : 'S'} DEEP.`;
    setText(note, status);
    el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
    setText(sleep, hunt.dormant ? 'WAKE' : 'GO TO GROUND');
    setAttr(sleep, 'aria-label', hunt.dormant ? 'Wake' : 'Go to ground');
    for (const p of places) p.render(cut);

    const key = `${CUT_UPGRADES.map((u) => `${u.id}:${cut.bought[u.id] ?? 0}`).join(',')}`;
    if (key !== shownUpgrades) {
      shownUpgrades = key;
      upgrades.replaceChildren(
        ...CUT_UPGRADES.filter((u) => isCutUpgradeAvailable(cut, u.id)).map((u) => {
          const cost = cutUpgradeCost(cut, u.id);
          const buy = h('button', { class: 'buy', type: 'button', 'data-cost': cost, 'aria-label': `Buy ${u.name} for ${formatNumber(cost)} dread` }, `${formatNumber(cost)} DREAD`);
          buy.addEventListener('click', () => store.dispatch({ type: 'buyCutUpgrade', id: u.id }));
          const times = cut.bought[u.id] ?? 0;
          return h('li', { class: 'item' }, h('div', { class: 'item-head' }, h('span', { class: 'item-name' }, u.name), h('span', { class: 'item-owned' }, times ? `×${times}` : '')), h('p', { class: 'item-desc' }, u.description), h('div', { class: 'item-foot' }, buy));
        }),
      );
    }
    for (const b of upgrades.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = hunt.dread < Number(b.dataset.cost);

    // The latest deaths from every place, newest first.
    const kills = hunt.prey
      .flatMap((p) => p.run.log.filter((e) => e.kind === 'kill').map((e) => ({ place: p.run.config.title, t: e.t, text: e.text, key: `${p.run.seed}:${e.id}` })))
      .sort((a, b) => b.t - a.t)
      .slice(0, FEED);
    const feedKey = kills.map((k) => k.key).join(',');
    if (feedKey !== shownFeed) {
      shownFeed = feedKey;
      feed.replaceChildren(...kills.map((k) => h('li', { class: 'log-entry log-kill' }, h('span', { class: 'log-time' }, k.place), ' ', h('span', { class: 'log-text' }, k.text))));
    }
    // Last, so the controls it points at are labelled.
    guide.render(game);
  }

  return { el, render };
}
