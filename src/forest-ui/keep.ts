import { formatDuration, formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { CLASSES, CLASS_IDS } from '../forest-data/classes';
import { FLOORS, KEEP_NAME } from '../forest-data/keep';
import { available, frontierFloor, keepFrontier, keepProject, maxStandingRegions, oilPerTrip, OIL_PRICE, postStrength } from '../forest/company';
import { KEEP, type Company } from '../forest/state';
import type { ForestStore } from '../forest/store';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const lower = (name: string) => name.toLowerCase();

/** The Keep's side of the expeditions panel: one assault on the frontier floor, and the floors held behind it. */
export function createKeepView(store: ForestStore): { el: HTMLElement; render(c: Company): void } {
  const title = h('h3', { class: 'sys-name' });
  const desc = h('p', { class: 'sys-desc' });
  const cleared = h('span', { class: 'odds-value', 'aria-label': 'Cleared' });
  const odds = h('span', { class: 'odds-value', 'aria-label': 'Strength against threat' });
  const counts = CLASSES.map((k) => {
    const value = h('span', { class: 'order-count', 'aria-label': `${k.plural} for the keep` }, '0');
    const less = h('button', { class: 'order-step', type: 'button', 'aria-label': `One fewer ${lower(k.name)} for the keep` }, '−');
    const more = h('button', { class: 'order-step', type: 'button', 'aria-label': `One more ${lower(k.name)} for the keep` }, '+');
    less.addEventListener('click', () => store.dispatch({ type: 'adjustOrder', region: KEEP, id: k.id, step: -1 }));
    more.addEventListener('click', () => store.dispatch({ type: 'adjustOrder', region: KEEP, id: k.id, step: 1 }));
    const el = h('div', { class: 'order-class' }, h('span', { class: 'order-name' }, k.short), h('div', { class: 'order-steps' }, less, value, more));
    return { k, el, value };
  });
  const forecast = h('p', { class: 'forecast' });
  const oil = h('span', { class: 'oil-value', 'aria-label': 'Lamp oil' });
  const buyOil = h('button', { class: 'buy', type: 'button', 'aria-label': 'Buy oil for one trip' });
  buyOil.addEventListener('click', () => {
    const c = store.getState().company;
    store.dispatch({ type: 'buyOil', flasks: Math.ceil(oilPerTrip(c, c.orders[KEEP]!)) });
  });
  const dark = h('p', { class: 'keep-dark' }, 'SHORT OF OIL: THE PARTY WILL GO INTO THE DARK, AND FEW COME BACK WHOLE.');
  const send = h('button', { class: 'buy send', type: 'button', 'aria-label': 'Send a party into the keep' }, 'SEND THE PARTY');
  send.addEventListener('click', () => store.dispatch({ type: 'dispatch', region: KEEP }));
  const standing = h('button', { class: 'standing', type: 'button', 'aria-label': 'Keep order sends itself', 'aria-pressed': 'false' });
  standing.addEventListener('click', () => store.dispatch({ type: 'toggleStanding', region: KEEP }));
  const allHeld = h('p', { class: 'sealed' }, 'EVERY FLOOR OF THE KEEP IS HELD. THERE IS NOWHERE DEEPER TO GO.');
  const card = h(
    'article',
    { class: 'sys-row region-card keep-card', 'aria-label': 'Assault on the keep' },
    h('div', { class: 'sys-head' }, title, h('span', { class: 'odds' }, odds)),
    desc,
    h('p', { class: 'keep-cleared' }, 'CLEARED ', cleared),
    h('div', { class: 'order' }, ...counts.map((x) => x.el)),
    forecast,
    h('p', { class: 'keep-oil' }, 'LAMP OIL ', oil, ' ', buyOil),
    dark,
    h('div', { class: 'card-actions' }, send, standing),
  );

  const rows = FLOORS.map((floor, i) => {
    const name = lower(floor.name);
    const status = h('span', { class: 'floor-status' });
    const garrison = h('span', { class: 'floor-garrison', 'aria-label': `Garrison of ${name}` });
    const posted = h('span', { class: 'order-count', 'aria-label': `Blades posted on ${name}` });
    const less = h('button', { class: 'order-step', type: 'button', 'aria-label': `Call a blade back from ${name}` }, '−');
    const more = h('button', { class: 'order-step', type: 'button', 'aria-label': `Post a blade on ${name}` }, '+');
    less.addEventListener('click', () => store.dispatch({ type: 'post', floor: i, step: -1 }));
    more.addEventListener('click', () => store.dispatch({ type: 'post', floor: i, step: 1 }));
    const li = h(
      'li',
      { class: 'floor-row', 'data-floor': floor.id },
      h('span', { class: 'floor-name' }, floor.name),
      status,
      h('span', { class: 'floor-hold' }, 'GARRISON ', garrison),
      h('div', { class: 'order-steps' }, less, posted, more),
    );
    return { floor, li, status, garrison, posted, less, more };
  });
  const floorList = h('ul', { class: 'floor-list' }, ...rows.map((r) => r.li));
  const floors = h(
    'section',
    { class: 'keep-floors', 'aria-label': 'The floors of the keep' },
    h('h3', { class: 'panel-subtitle' }, `THE FLOORS OF ${KEEP_NAME}`),
    h('p', { class: 'sys-desc' }, 'A FLOOR IS HELD ONLY WHILE ITS GARRISON MATCHES ITS THREAT. POSTED BLADES DRAW WAGES AND NEVER TRAVEL.'),
    floorList,
  );

  const el = h('div', { class: 'keep-view' }, card, allHeld, floors);

  function render(c: Company) {
    const floor = frontierFloor(c);
    const front = keepFrontier(c);
    card.hidden = floor === null;
    allHeld.hidden = floor !== null;
    if (floor) {
      const order = c.orders[KEEP]!;
      const need = oilPerTrip(c, order);
      const p = keepProject(c, order, c.oil >= need ? 0 : 1 - c.oil / need);
      setText(title, floor.name);
      setText(desc, floor.description);
      setText(cleared, pct(c.floors[front]!.control));
      setText(odds, `${formatNumber(p.strength)} / ${formatNumber(p.danger)}`);
      card.dataset.odds = p.ratio >= 1 ? 'good' : p.ratio >= 0.6 ? 'risky' : 'grim';
      for (const x of counts) setText(x.value, String(order[x.k.id]));
      setText(
        forecast,
        `EXPECT ~${formatNumber(p.haul)} RELICS IN ${formatDuration(p.duration)}. EACH HAND: ${pct(p.woundRisk)} WOUNDED, ${pct(p.woundRisk * p.deathRisk)} DEAD. BLIGHT +${p.blightPerHand.toFixed(2)} EACH.`,
      );
      setText(oil, `${formatNumber(c.oil)} FLASKS · ${formatNumber(need)} A TRIP`);
      const flasks = Math.ceil(need);
      setText(buyOil, `BUY OIL FOR ONE TRIP (${formatNumber(flasks * OIL_PRICE)} ₮)`);
      buyOil.disabled = c.silver < flasks * OIL_PRICE;
      dark.hidden = c.oil >= need;
      const short = CLASS_IDS.filter((id) => available(c, id) < order[id]);
      send.disabled = short.length > 0 || CLASS_IDS.every((id) => order[id] === 0);
      setText(send, short.length > 0 ? `NOT ENOUGH ${short.map((id) => CLASSES.find((k) => k.id === id)!.plural).join(', ')}` : 'SEND THE PARTY');
      const allowed = maxStandingRegions(c);
      const on = c.standing.includes(KEEP);
      standing.hidden = allowed === 0;
      setAttr(standing, 'aria-pressed', String(on));
      setText(standing, on ? 'SENDS ITSELF ✓' : `QUARTERMASTER (${c.standing.length}/${allowed})`);
      standing.disabled = !on && c.standing.length >= allowed;
    }

    const per = postStrength(c);
    for (const [i, row] of rows.entries()) {
      const s = c.floors[i]!;
      const shown = s.control > 0 || i === front;
      row.li.hidden = !shown;
      if (!shown) continue;
      const state = i === front ? 'frontier' : s.secured ? (s.control >= 1 ? 'held' : 'contested') : 'lost';
      row.li.dataset.state = state;
      setText(row.status, state === 'frontier' ? `FRONTIER ${pct(s.control)}` : state === 'contested' ? `CONTESTED ${pct(s.control)}` : state === 'held' ? 'HELD' : `LOST ${pct(s.control)}`);
      setText(row.garrison, `${formatNumber(c.posted[i]! * per)} / ${formatNumber(row.floor.threat)}`);
      setText(row.posted, String(c.posted[i]));
      row.less.disabled = c.posted[i]! === 0;
      row.more.disabled = s.control <= 0 || available(c, 'blade') === 0;
    }
  }

  return { el, render };
}
