import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { DEEP_UPGRADES } from '../fathom-data/deep-upgrades';
import { DEEP_ADAPTER, deepUpgradeCost, isDeepUpgradeAvailable, type DeepHunt } from '../fathom/deep';
import { legendEarned } from '../engine/hunt';
import { createConfirmButton } from '../engine/ui/confirm';
import type { FathomGame } from '../fathom/game';
import type { FathomStore } from '../fathom/store';
import { seasonClock } from './app';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { huntGuide } from '../engine/hunt-guide';

const ACT_NAMES = ['', 'THE SEASON', 'SIGHTINGS', 'THE SOURCE', 'LANDFALL'];
const FEED = 8;
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

function createTownStrip(store: FathomStore, index: number, town: string) {
  const title = h('span', { class: 'deep-title' });
  const act = h('span', { class: 'deep-act' });
  const drowned = h('span', { class: 'deep-drowned', 'aria-label': `Drowned at ${town}` });
  const coast = h('span', { class: 'deep-coast' });
  const alarmFill = h('i', { class: 'deep-alarm-fill' });
  const push = h('span', { class: 'deep-push' }, '0');
  const less = h('button', { class: 'deep-step', type: 'button', 'aria-label': `Sink away from ${town}` }, '−');
  const more = h('button', { class: 'deep-step', type: 'button', 'aria-label': `Rise under ${town}` }, '+');
  less.addEventListener('click', () => store.dispatch({ type: 'shiftDeepPush', index, step: -1 }));
  more.addEventListener('click', () => store.dispatch({ type: 'shiftDeepPush', index, step: 1 }));
  const el = h(
    'section',
    { class: 'deep-town', role: 'group', 'aria-label': town },
    h('div', { class: 'deep-row' }, title, drowned),
    h('div', { class: 'deep-row' }, act, coast),
    h('span', { class: 'deep-alarm', 'aria-hidden': 'true' }, alarmFill),
    h('div', { class: 'deep-steps' }, less, push, more),
  );
  return {
    el,
    render(d: DeepHunt) {
      const prey = d.hunt.prey[index]!;
      const o = prey.outfit;
      setText(title, `${town} · SEASON ${o.terms.season}`);
      setText(act, `ACT ${o.act}: ${ACT_NAMES[o.act] ?? ''}`);
      setText(drowned, `${formatNumber(o.bodyCount)} DROWNED`);
      const fallen = o.cities.filter((c) => !c.secured).length;
      setText(coast, o.cities.length === 0 ? 'THE COAST IS QUIET' : `${fallen} OF ${o.cities.length} CITIES FALLEN`);
      alarmFill.style.width = `${Math.round(DEEP_ADAPTER.alarm(prey) * 100)}%`;
      setText(push, String(d.hunt.split[index] ?? 0));
      el.dataset.pushed = String((d.hunt.split[index] ?? 0) > 0);
    },
  };
}

/** The sonar turned around: the towns as the thing behind the seam hears them. */
export function createDeepView(store: FathomStore): { el: HTMLElement; render(game: FathomGame): void } {
  const name = h('h2', { class: 'deep-name' }, 'THE SOURCE');
  const back = h('button', { class: 'deep-back', type: 'button', 'aria-label': 'Return to the surface' }, 'RETURN TO THE SURFACE');
  back.addEventListener('click', () => store.dispatch({ type: 'leaveDeep' }));
  const guide = createGuideView<FathomGame>({ ...GUIDE, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
  };
  const drowned = stat('THE DROWNED', 'The drowned');
  const hunger = stat('HUNGER', 'Hunger');
  const sightings = stat('SIGHTINGS', 'Sightings');
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: 'deep-note' });
  const sink = h('button', { class: 'deep-sink', type: 'button' });
  sink.addEventListener('click', () => store.dispatch({ type: 'toggleDeepDormant' }));
  // Ending the hunt is for good, so it takes a second tap.
  const end = createConfirmButton({ className: 'deep-sink deep-end', onConfirm: () => store.dispatch({ type: 'endDeep' }) });
  let towns: ReturnType<typeof createTownStrip>[] = [];
  const townList = h('div', { class: 'deep-towns' });
  const upgrades = h('ul', { class: 'deep-upgrades' });
  const feed = h('ol', { class: 'deep-feed', 'aria-label': 'What the Source took' });
  const el = h(
    'section',
    { class: 'deep', 'aria-label': 'The Source', hidden: true },
    h('header', { class: 'deep-head' }, name, guide.rulesButton, back),
    h(
      'div',
      { class: 'deep-body' },
      h(
        'div',
        { class: 'deep-col' },
        guide.el,
        h('dl', { class: 'stats' }, drowned.el, hunger.el, sightings.el, free.el),
        note,
        townList,
        sink,
        end.el,
        h('h3', { class: 'panel-sub' }, 'WHAT THE SOURCE TOOK'),
        feed,
      ),
      h('div', { class: 'deep-col' }, h('h3', { class: 'panel-sub' }, 'WHAT THE SOURCE BECOMES'), upgrades),
    ),
    guide.rulesDialog,
  );
  let shownUpgrades = '';
  let shownFeed = '';

  function render(game: FathomGame) {
    el.hidden = game.mode !== 'deep' || !game.deep;
    const d = game.deep;
    if (el.hidden || !d) return guide.render(game);
    const hunt = d.hunt;
    if (towns.length !== hunt.prey.length) {
      towns = hunt.prey.map((p, i) => createTownStrip(store, i, p.town));
      townList.replaceChildren(...towns.map((t) => t.el));
    }
    setText(drowned.value, formatNumber(hunt.dread));
    setText(hunger.value, `${Math.round(hunt.hunger)}%`);
    setText(sightings.value, hunt.notoriety.toFixed(2));
    const used = hunt.split.reduce((a, b) => a + b, 0);
    setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
    setText(
      note,
      hunt.beatenFor > 0
        ? `A town closed the seam. The Source sinks back for ${Math.ceil(hunt.beatenFor / 60)} minutes.`
        : hunt.dormant
          ? 'THE SOURCE LIES DEEP. ON THE COAST, THE SIGHTINGS STOP MAKING THE PAPERS.'
          : hunt.hunger <= 0
            ? 'THE SOURCE IS STARVING. NOTHING MOVES BELOW THE THERMOCLINE.'
            : used === 0
              ? 'THE SOURCE LISTENS TO THE TOWNS ON THE SURFACE. RISE UNDER ONE.'
              : `THE SOURCE RISES UNDER ${used === 1 ? 'ONE TOWN' : 'THE TOWNS'}. THE WATER IS COLDER THERE.`,
    );
    el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
    setText(sink, hunt.dormant ? 'RISE' : 'SINK');
    setAttr(sink, 'aria-label', hunt.dormant ? 'Rise' : 'Sink');
    for (const t of towns) t.render(d);
    const carried = game.profile.legend.deep ?? 0;
    setText(name, carried > 0 ? `THE SOURCE · LEGEND ${carried}` : 'THE SOURCE');
    const earned = legendEarned(hunt.harvest);
    end.label(`End the hunt for ${earned} Legend`, `END THE HUNT · +${earned} LEGEND`);

    const key = DEEP_UPGRADES.map((u) => `${u.id}:${d.bought[u.id] ?? 0}`).join(',');
    if (key !== shownUpgrades) {
      shownUpgrades = key;
      upgrades.replaceChildren(
        ...DEEP_UPGRADES.filter((u) => isDeepUpgradeAvailable(d, u.id)).map((u) => {
          const cost = deepUpgradeCost(d, u.id);
          const grow = h('button', { class: 'buy', type: 'button', 'data-cost': cost, 'aria-label': `Grow ${u.name} for ${formatNumber(cost)} drowned` }, `${formatNumber(cost)} DROWNED`);
          grow.addEventListener('click', () => store.dispatch({ type: 'buyDeepUpgrade', id: u.id }));
          const times = d.bought[u.id] ?? 0;
          return h('li', { class: 'deep-upgrade' }, h('div', { class: 'deep-row' }, h('span', {}, u.name), h('span', {}, times ? `×${times}` : '')), h('p', { class: 'deep-desc' }, u.description), grow);
        }),
      );
    }
    for (const b of upgrades.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = hunt.dread < Number(b.dataset.cost);

    const entries = hunt.prey
      .flatMap((p) => p.outfit.log.filter((e) => e.kind === 'attack').map((e) => ({ who: p.town, t: e.t, text: e.text, key: `${p.outfit.seed}:${e.id}` })))
      .sort((a, b) => b.t - a.t)
      .slice(0, FEED);
    const feedKey = entries.map((e) => e.key).join(',');
    if (feedKey !== shownFeed) {
      shownFeed = feedKey;
      feed.replaceChildren(...entries.map((e) => h('li', { class: 'deep-entry' }, h('span', { class: 'deep-when' }, `${seasonClock(e.t)} · ${e.who}`), ' ', e.text)));
    }
    // Last, so the controls it points at are labelled.
    guide.render(game);
  }

  return { el, render };
}
