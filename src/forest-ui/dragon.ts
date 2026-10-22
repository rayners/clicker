import { formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { createConfirmButton } from '../shared/ui/confirm';
import { legendEarned } from '../shared/hunt';
import { DRAGON_UPGRADES } from '../forest-data/dragon-upgrades';
import { DRAGON_ADAPTER, dragonUpgradeCost, isDragonUpgradeAvailable, type DragonHunt } from '../forest/dragon';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { formatDay } from '../forest/calendar';

/** The companies the dragon watches, by the order they came to Thistlegate (as the wood counts them). */
const COMPANY_NAMES = ['THE COMPANY OF THE ASHEN KEY', 'THE GREY LANTERN COMPANY', 'THE BRASS HOUND COMPANY', 'THE ORDER OF THE LONG ROAD'];
const ACT_NAMES = ['', 'THE CHARTER', 'MARKS', 'THE KEY', 'THE WOOD WAKES'];
const FEED = 8;

function createCompanyStrip(store: ForestStore, index: number) {
  const name = COMPANY_NAMES[index] ?? `COMPANY ${index + 1}`;
  const title = h('span', { class: 'wood-title' });
  const act = h('span', { class: 'wood-act' });
  const vault = h('span', { class: 'wood-lost', 'aria-label': `Vault of ${name}` });
  const raids = h('span', { class: 'wood-blight', 'aria-label': `Raids on ${name}` });
  const alarmFill = h('i', { class: 'wood-alarm-fill' });
  const push = h('span', { class: 'wood-push' }, '0');
  const less = h('button', { class: 'wood-step', type: 'button', 'aria-label': `Turn away from ${name}` }, '−');
  const more = h('button', { class: 'wood-step', type: 'button', 'aria-label': `Circle closer over ${name}` }, '+');
  less.addEventListener('click', () => store.dispatch({ type: 'shiftDragonPush', index, step: -1 }));
  more.addEventListener('click', () => store.dispatch({ type: 'shiftDragonPush', index, step: 1 }));
  const el = h(
    'section',
    { class: 'wood-company', role: 'group', 'aria-label': name },
    h('div', { class: 'wood-row' }, title, vault),
    h('div', { class: 'wood-row' }, act, raids),
    h('span', { class: 'wood-alarm', 'aria-hidden': 'true' }, alarmFill),
    h('div', { class: 'wood-steps' }, less, push, more),
  );
  return {
    el,
    render(d: DragonHunt) {
      const prey = d.hunt.prey[index]!;
      const c = prey.company;
      setText(title, `${name} · CHARTER ${c.charter.number}`);
      setText(act, `ACT ${c.act}: ${ACT_NAMES[c.act] ?? ''}`);
      setText(vault, `VAULT ${formatNumber(c.relics)}`);
      setText(raids, `${prey.raids} RAIDS`);
      alarmFill.style.width = `${Math.round(DRAGON_ADAPTER.alarm(prey) * 100)}%`;
      setText(push, String(d.hunt.split[index] ?? 0));
      el.dataset.pushed = String((d.hunt.split[index] ?? 0) > 0);
    },
  };
}

/** The ledger as the dragon keeps it: an inventory of the hoard, in gold on soot. */
export function createDragonView(store: ForestStore): { el: HTMLElement; render(game: ForestGame): void } {
  const back = h('button', { class: 'wood-back', type: 'button', 'aria-label': 'Return to the ledger' }, 'RETURN TO THE LEDGER');
  back.addEventListener('click', () => store.dispatch({ type: 'leaveDragon' }));
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
  };
  const hoard = stat('HOARD', 'Hoard');
  const hunger = stat('HUNGER', 'Hunger');
  const slayers = stat('SLAYERS', 'Slayers');
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: 'wood-note' });
  // Ending the hunt is for good, so it takes a second tap.
  const end = createConfirmButton({ className: 'wood-sleep wood-end', onConfirm: () => store.dispatch({ type: 'endDragon' }) });
  const name = h('h2', { class: 'wood-name' }, 'The Hoard');
  const sleep = h('button', { class: 'wood-sleep', type: 'button' });
  sleep.addEventListener('click', () => store.dispatch({ type: 'toggleDragonDormant' }));
  const companies = [0, 1, 2].map((i) => createCompanyStrip(store, i));
  const upgrades = h('ul', { class: 'wood-upgrades' });
  const feed = h('ol', { class: 'wood-feed', 'aria-label': 'What the dragon took' });
  const el = h(
    'section',
    { class: 'wood dragon', 'aria-label': 'The hoard', hidden: true },
    h('header', { class: 'wood-head' }, name, back),
    h(
      'div',
      { class: 'wood-body' },
      h(
        'div',
        { class: 'wood-col' },
        h('dl', { class: 'stats' }, hoard.el, hunger.el, slayers.el, free.el),
        note,
        ...companies.map((c) => c.el),
        sleep,
        end.el,
        h('h3', { class: 'panel-subtitle' }, 'WHAT THE DRAGON TOOK'),
        feed,
      ),
      h('div', { class: 'wood-col' }, h('h3', { class: 'panel-subtitle' }, 'WHAT THE DRAGON BECOMES'), upgrades),
    ),
  );
  let shownUpgrades = '';
  let shownFeed = '';

  function render(game: ForestGame) {
    el.hidden = game.mode !== 'dragon' || !game.dragon;
    const d = game.dragon;
    if (el.hidden || !d) return;
    const hunt = d.hunt;
    setText(hoard.value, formatNumber(Math.floor(hunt.dread)));
    setText(hunger.value, `${Math.round(hunt.hunger)}%`);
    setText(slayers.value, hunt.notoriety.toFixed(2));
    const used = hunt.split.reduce((a, b) => a + b, 0);
    setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
    setText(
      note,
      hunt.beatenFor > 0
        ? `A charter came to its reckoning, and the town rang every bell it had. The dragon keeps to its lair for ${Math.ceil(hunt.beatenFor / 60)} minutes.`
        : hunt.dormant
          ? 'The dragon sleeps on its hoard. The slayers drink in the town, and grow bored, and leave.'
          : hunt.hunger <= 0
            ? 'The dragon is too hungry to fly.'
            : used === 0
              ? 'Three companies, three vaults filling. Choose one to circle.'
              : `The dragon circles ${used === 1 ? 'one company' : 'the companies'}. The vault guards look up a great deal.`,
    );
    el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
    setText(sleep, hunt.dormant ? 'WAKE' : 'SLEEP ON THE HOARD');
    setAttr(sleep, 'aria-label', hunt.dormant ? 'Wake' : 'Sleep on the hoard');
    const carried = game.profile.legend.dragon ?? 0;
    setText(name, carried > 0 ? `The Hoard · Legend ${carried}` : 'The Hoard');
    const earned = legendEarned(hunt.harvest);
    end.label(`End the hunt for ${earned} Legend`, `END THE HUNT · +${earned} LEGEND`);
    for (const c of companies) c.render(d);

    const key = DRAGON_UPGRADES.map((u) => `${u.id}:${d.bought[u.id] ?? 0}`).join(',');
    if (key !== shownUpgrades) {
      shownUpgrades = key;
      upgrades.replaceChildren(
        ...DRAGON_UPGRADES.filter((u) => isDragonUpgradeAvailable(d, u.id)).map((u) => {
          const cost = dragonUpgradeCost(d, u.id);
          const grow = h('button', { class: 'buy', type: 'button', 'data-cost': cost, 'aria-label': `Grow ${u.name} for ${formatNumber(cost)} hoard` }, `${formatNumber(cost)} HOARD`);
          grow.addEventListener('click', () => store.dispatch({ type: 'buyDragonUpgrade', id: u.id }));
          const times = d.bought[u.id] ?? 0;
          return h('li', { class: 'wood-upgrade' }, h('div', { class: 'wood-row' }, h('span', {}, u.name), h('span', {}, times ? `×${times}` : '')), h('p', { class: 'wood-desc' }, u.description), grow);
        }),
      );
    }
    for (const b of upgrades.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = hunt.dread < Number(b.dataset.cost);

    const entries = hunt.prey
      .flatMap((p, i) =>
        p.company.log.filter((e) => /WINGS OVER THE VAULT/.test(e.text)).map((e) => ({ who: COMPANY_NAMES[i] ?? '', t: e.t, text: e.text, key: `${p.company.seed}:${e.id}` })),
      )
      .sort((a, b) => b.t - a.t)
      .slice(0, FEED);
    const feedKey = entries.map((e) => e.key).join(',');
    if (feedKey !== shownFeed) {
      shownFeed = feedKey;
      feed.replaceChildren(...entries.map((e) => h('li', { class: 'wood-entry' }, h('span', { class: 'wood-when' }, `${formatDay(e.t)} · ${e.who}`), ' ', e.text)));
    }
  }

  return { el, render };
}
