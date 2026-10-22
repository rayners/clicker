import { formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { createConfirmButton } from '../shared/ui/confirm';
import { legendEarned } from '../shared/hunt';
import { WOOD_UPGRADES } from '../forest-data/wood-upgrades';
import { isWoodUpgradeAvailable, woodUpgradeCost, WOOD_ADAPTER, type WoodHunt } from '../forest/wood';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { formatDay } from '../forest/calendar';

/** The companies the wood is watching, by the order they came to Thistlegate. */
const COMPANY_NAMES = ['THE COMPANY OF THE ASHEN KEY', 'THE GREY LANTERN COMPANY', 'THE BRASS HOUND COMPANY', 'THE ORDER OF THE LONG ROAD'];
const ACT_NAMES = ['', 'THE CHARTER', 'MARKS', 'THE KEY', 'THE WOOD WAKES'];
const FEED = 8;

function createCompanyStrip(store: ForestStore, index: number) {
  const name = COMPANY_NAMES[index] ?? `COMPANY ${index + 1}`;
  const title = h('span', { class: 'wood-title' });
  const act = h('span', { class: 'wood-act' });
  const lost = h('span', { class: 'wood-lost', 'aria-label': `Hands lost by ${name}` });
  const blight = h('span', { class: 'wood-blight', 'aria-label': `Blight in ${name}` });
  const alarmFill = h('i', { class: 'wood-alarm-fill' });
  const push = h('span', { class: 'wood-push' }, '0');
  const less = h('button', { class: 'wood-step', type: 'button', 'aria-label': `Ease off ${name}` }, '−');
  const more = h('button', { class: 'wood-step', type: 'button', 'aria-label': `Lean harder on ${name}` }, '+');
  less.addEventListener('click', () => store.dispatch({ type: 'shiftWoodPush', index, step: -1 }));
  more.addEventListener('click', () => store.dispatch({ type: 'shiftWoodPush', index, step: 1 }));
  const el = h(
    'section',
    { class: 'wood-company', role: 'group', 'aria-label': name },
    h('div', { class: 'wood-row' }, title, lost),
    h('div', { class: 'wood-row' }, act, blight),
    h('span', { class: 'wood-alarm', 'aria-hidden': 'true' }, alarmFill),
    h('div', { class: 'wood-steps' }, less, push, more),
  );
  return {
    el,
    render(w: WoodHunt) {
      const prey = w.hunt.prey[index]!;
      const c = prey.company;
      setText(title, `${name} · CHARTER ${c.charter.number}`);
      setText(act, `ACT ${c.act}: ${ACT_NAMES[c.act] ?? ''}`);
      setText(lost, `${formatNumber(c.lifetimeDead + c.turned)} HANDS TAKEN`);
      setText(blight, `BLIGHT ${Math.round(c.blight)}%`);
      alarmFill.style.width = `${Math.round(WOOD_ADAPTER.alarm(prey) * 100)}%`;
      setText(push, String(w.hunt.split[index] ?? 0));
      el.dataset.pushed = String((w.hunt.split[index] ?? 0) > 0);
    },
  };
}

/** The ledger turned over: the wood's own account, in a hand nobody at Thistlegate wrote. */
export function createWoodView(store: ForestStore): { el: HTMLElement; render(game: ForestGame): void } {
  const back = h('button', { class: 'wood-back', type: 'button', 'aria-label': 'Return to the ledger' }, 'RETURN TO THE LEDGER');
  back.addEventListener('click', () => store.dispatch({ type: 'leaveWood' }));
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
  };
  const sap = stat('SAP', 'Sap');
  const hunger = stat('HUNGER', 'Hunger');
  const fear = stat('FEAR', 'Fear');
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: 'wood-note' });
  // Ending the hunt is for good, so it takes a second tap.
  const end = createConfirmButton({ className: 'wood-sleep wood-end', onConfirm: () => store.dispatch({ type: 'endWood' }) });
  const name = h('h2', { class: 'wood-name' }, 'The Wood Listens');
  const sleep = h('button', { class: 'wood-sleep', type: 'button' });
  sleep.addEventListener('click', () => store.dispatch({ type: 'toggleWoodDormant' }));
  const companies = [0, 1, 2].map((i) => createCompanyStrip(store, i));
  const upgrades = h('ul', { class: 'wood-upgrades' });
  const feed = h('ol', { class: 'wood-feed', 'aria-label': 'What the wood took' });
  const el = h(
    'section',
    { class: 'wood', 'aria-label': 'The wood', hidden: true },
    h('header', { class: 'wood-head' }, name, back),
    h(
      'div',
      { class: 'wood-body' },
      h(
        'div',
        { class: 'wood-col' },
        h('dl', { class: 'stats' }, sap.el, hunger.el, fear.el, free.el),
        note,
        ...companies.map((c) => c.el),
        sleep,
        end.el,
        h('h3', { class: 'panel-subtitle' }, 'WHAT THE WOOD TOOK'),
        feed,
      ),
      h('div', { class: 'wood-col' }, h('h3', { class: 'panel-subtitle' }, 'WHAT THE WOOD BECOMES'), upgrades),
    ),
  );
  let shownUpgrades = '';
  let shownFeed = '';

  function render(game: ForestGame) {
    el.hidden = game.mode !== 'wood' || !game.wood;
    const w = game.wood;
    if (el.hidden || !w) return;
    const hunt = w.hunt;
    setText(sap.value, formatNumber(hunt.dread));
    setText(hunger.value, `${Math.round(hunt.hunger)}%`);
    setText(fear.value, hunt.notoriety.toFixed(2));
    const used = hunt.split.reduce((a, b) => a + b, 0);
    setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
    setText(
      note,
      hunt.beatenFor > 0
        ? `A charter ended and the Synod burned the eaves. The wood draws back for ${Math.ceil(hunt.beatenFor / 60)} minutes.`
        : hunt.dormant
          ? 'The wood sleeps. In the town, they begin to forget.'
          : hunt.hunger <= 0
            ? 'The wood is starving. Nothing moves under the trees.'
            : used === 0
              ? 'The wood watches the companies come and go. Lean on one.'
              : `The wood leans on ${used === 1 ? 'one company' : 'the companies'}. The paths are closing.`,
    );
    el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
    setText(sleep, hunt.dormant ? 'WAKE' : 'SLEEP');
    setAttr(sleep, 'aria-label', hunt.dormant ? 'Wake' : 'Sleep');
    const carried = game.profile.legend.wood ?? 0;
    setText(name, carried > 0 ? `The Wood Listens · Legend ${carried}` : 'The Wood Listens');
    const earned = legendEarned(hunt.harvest);
    end.label(`End the hunt for ${earned} Legend`, `END THE HUNT · +${earned} LEGEND`);
    for (const c of companies) c.render(w);

    const key = WOOD_UPGRADES.map((u) => `${u.id}:${w.bought[u.id] ?? 0}`).join(',');
    if (key !== shownUpgrades) {
      shownUpgrades = key;
      upgrades.replaceChildren(
        ...WOOD_UPGRADES.filter((u) => isWoodUpgradeAvailable(w, u.id)).map((u) => {
          const cost = woodUpgradeCost(w, u.id);
          const grow = h('button', { class: 'buy', type: 'button', 'data-cost': cost, 'aria-label': `Grow ${u.name} for ${formatNumber(cost)} sap` }, `${formatNumber(cost)} SAP`);
          grow.addEventListener('click', () => store.dispatch({ type: 'buyWoodUpgrade', id: u.id }));
          const times = w.bought[u.id] ?? 0;
          return h('li', { class: 'wood-upgrade' }, h('div', { class: 'wood-row' }, h('span', {}, u.name), h('span', {}, times ? `×${times}` : '')), h('p', { class: 'wood-desc' }, u.description), grow);
        }),
      );
    }
    for (const b of upgrades.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = hunt.dread < Number(b.dataset.cost);

    const entries = hunt.prey
      .flatMap((p, i) =>
        p.company.log
          .filter((e) => e.kind === 'omen' || e.kind === 'hand')
          .map((e) => ({ who: COMPANY_NAMES[i] ?? '', t: e.t, text: e.text, key: `${p.company.seed}:${e.id}` })),
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
