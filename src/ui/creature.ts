import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { creatureUpgradeCost, isCreatureUpgradeAvailable, CREATURE_ADAPTER, type CreatureHunt } from '../core/creature';
import { CREATURE_UPGRADES } from '../data/creature/upgrades';
import type { CreatureMission, ScenarioId } from '../mission/state';
import { formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';

const KIND: Record<ScenarioId, string> = { extraction: 'EXTRACTION', terraform: 'TERRAFORM', security: 'SECURITY' };
/** How each WARDEN's thinking reads from inside the walls. */
const ACT_NAMES = ['', 'ROUTINE', 'NOTICED', 'HUNTED', 'VENTED'];
const FEED = 8;

function createShipStrip(store: Store, index: number) {
  const title = h('span', { class: 'xeno-title' });
  const act = h('span', { class: 'xeno-act' });
  const taken = h('span', { class: 'xeno-taken' });
  const suspicion = h('span', { class: 'xeno-suspicion' });
  const fill = h('i', { class: 'xeno-alarm-fill' });
  const push = h('span', { class: 'xeno-push' }, '0');
  const less = h('button', { class: 'xeno-step', type: 'button' }, '−');
  const more = h('button', { class: 'xeno-step', type: 'button' }, '+');
  less.addEventListener('click', () => store.dispatch({ type: 'shiftCreaturePush', index, step: -1 }));
  more.addEventListener('click', () => store.dispatch({ type: 'shiftCreaturePush', index, step: 1 }));
  const el = h(
    'section',
    { class: 'xeno-ship', role: 'group' },
    h('div', { class: 'xeno-row' }, title, taken),
    h('div', { class: 'xeno-row' }, act, suspicion),
    h('span', { class: 'xeno-alarm', 'aria-hidden': 'true' }, fill),
    h('div', { class: 'xeno-steps' }, less, push, more),
  );
  let named = '';
  return {
    el,
    render(c: CreatureHunt) {
      const prey = c.hunt.prey[index]!;
      const m = prey.mission as CreatureMission;
      const name = m.config.shipName.toUpperCase();
      if (name !== named) {
        named = name;
        setAttr(el, 'aria-label', name);
        setAttr(taken, 'aria-label', `Taken from ${name}`);
        setAttr(suspicion, 'aria-label', `Suspicion aboard ${name}`);
        setAttr(less, 'aria-label', `Ease off ${name}`);
        setAttr(more, 'aria-label', `Stalk ${name} harder`);
      }
      setText(title, `${name} · ${KIND[m.scenario]} #${prey.contract}`);
      setText(act, `WARDEN: ${ACT_NAMES[m.act] ?? 'VENTED'}`);
      setText(taken, `${formatNumber(m.taken)} TAKEN`);
      const alarm = CREATURE_ADAPTER.alarm(prey);
      setText(suspicion, `SUSPICION ${Math.round(alarm * 100)}%`);
      fill.style.width = `${Math.round(alarm * 100)}%`;
      const steps = c.hunt.split[index] ?? 0;
      setText(push, String(steps));
      el.dataset.pushed = String(steps > 0);
      el.dataset.wary = String(alarm >= 0.75);
    },
  };
}

/** Special Order 0-77, accepted: WARDEN sees the ships from inside the vents, in heat. */
export function createCreatureView(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const back = h('button', { class: 'xeno-back', type: 'button', 'aria-label': 'Return to the contract' }, 'RETURN TO CONTRACT');
  back.addEventListener('click', () => store.dispatch({ type: 'leaveCreature' }));
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'xeno-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'xeno-stat' }, h('dt', {}, label), value) };
  };
  const biomass = stat('BIOMASS', 'Biomass');
  const hunger = stat('HUNGER', 'Hunger');
  const whispers = stat('WHISPERS', 'Whispers');
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: 'xeno-note' });
  const sleep = h('button', { class: 'xeno-sleep', type: 'button' });
  sleep.addEventListener('click', () => store.dispatch({ type: 'toggleCreatureDormant' }));
  const ships = [0, 1, 2].map((i) => createShipStrip(store, i));
  const upgrades = h('ul', { class: 'xeno-upgrades' });
  const feed = h('ol', { class: 'xeno-feed', 'aria-label': 'What it took' });
  // Titled only while open, so the archive's own copy of the order is the only one on the page otherwise.
  const title = h('h2', { class: 'xeno-name' });
  const el = h(
    'section',
    { class: 'xeno', 'aria-label': 'Special Order 0-77', hidden: true },
    h('header', { class: 'xeno-head' }, title, back),
    h(
      'div',
      { class: 'xeno-body' },
      h(
        'div',
        { class: 'xeno-col' },
        h('dl', { class: 'xeno-stats' }, biomass.el, hunger.el, whispers.el, free.el),
        note,
        ...ships.map((s) => s.el),
        sleep,
        h('h3', { class: 'xeno-sub' }, 'WHAT IT TOOK'),
        feed,
      ),
      h('div', { class: 'xeno-col' }, h('h3', { class: 'xeno-sub' }, 'WHAT IT BECOMES'), upgrades),
    ),
  );
  let shownUpgrades = '';
  let shownFeed = '';

  function render(game: GameState) {
    el.hidden = game.mode !== 'creature' || !game.creature;
    const c = game.creature;
    setText(title, el.hidden ? '' : 'SPECIAL ORDER 0-77');
    if (el.hidden || !c) return;
    const hunt = c.hunt;
    setText(biomass.value, formatNumber(hunt.dread));
    setText(hunger.value, `${Math.round(hunt.hunger)}%`);
    setText(whispers.value, hunt.notoriety.toFixed(2));
    const used = hunt.split.reduce((a, b) => a + b, 0);
    setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
    setText(
      note,
      hunt.beatenFor > 0
        ? `A WARDEN vented its decks. It lies in the cold of the hull for ${Math.ceil(hunt.beatenFor / 60)} minutes.`
        : hunt.dormant
          ? 'DORMANT. IN THE CREW LOUNGES, THE STORIES STOP.'
          : hunt.hunger <= 0
            ? 'STARVING. IT CANNOT MOVE.'
            : used === 0
              ? 'IT WAITS IN THE VENTS OF THREE SHIPS. CHOOSE ONE.'
              : 'IT IS IN THE WALLS. THE CREWS HEAR SOMETHING.',
    );
    el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
    setText(sleep, hunt.dormant ? 'WAKE' : 'GO DORMANT');
    setAttr(sleep, 'aria-label', hunt.dormant ? 'Wake' : 'Go dormant');
    for (const s of ships) s.render(c);

    const key = CREATURE_UPGRADES.map((u) => `${u.id}:${c.bought[u.id] ?? 0}`).join(',');
    if (key !== shownUpgrades) {
      shownUpgrades = key;
      upgrades.replaceChildren(
        ...CREATURE_UPGRADES.filter((u) => isCreatureUpgradeAvailable(c, u.id)).map((u) => {
          const cost = creatureUpgradeCost(c, u.id);
          const evolve = h('button', { class: 'buy', type: 'button', 'data-cost': cost, 'aria-label': `Evolve ${u.name} for ${formatNumber(cost)} biomass` }, `${formatNumber(cost)} BIOMASS`);
          evolve.addEventListener('click', () => store.dispatch({ type: 'buyCreatureUpgrade', id: u.id }));
          const times = c.bought[u.id] ?? 0;
          return h('li', { class: 'xeno-upgrade' }, h('div', { class: 'xeno-row' }, h('span', {}, u.name), h('span', {}, times ? `×${times}` : '')), h('p', { class: 'xeno-desc' }, u.description), evolve);
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
  }

  return { el, render };
}
