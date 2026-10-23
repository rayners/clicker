import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { frontier } from '../engine/ground';
import { COUNSELORS, LIGHTS, ZONES } from '../late-fees-data/camp';
import { CAMP_UPGRADES } from '../late-fees-data/camp-upgrades';
import {
  availableCampUpgrades,
  counselorCost,
  counselorForce,
  isCounselorRevealed,
  isHeadCounselorActive,
  isLightRevealed,
  lightCost,
  lightSupply,
  prepForce,
  staff,
  towerCost,
  towerWatch,
  watchForce,
  watchNeeded,
} from '../late-fees/camp/economy';
import type { CampRun } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';

type ZoneState = 'open' | 'slipping' | 'frontier' | 'closed';
const HEAD = CAMP_UPGRADES.find((u) => u.effect.kind === 'headCounselor')!.id;

/** The camp map: zones from the front gate to where he drowned. */
export function createZones(): { el: HTMLElement; render(r: CampRun): void } {
  const rows = ZONES.map((z) => {
    const fill = h('i', { class: 'zone-fill' });
    const state = h('span', { class: 'zone-state' });
    const el = h(
      'li',
      { class: 'zone', 'data-state': 'closed', 'data-deep': String(Boolean(z.deep)) },
      h('span', { class: 'zone-name' }, z.name),
      state,
      h('span', { class: 'zone-bar', 'aria-hidden': 'true' }, fill),
    );
    return { el, fill, state };
  });
  const el = h('section', { class: 'zones', 'aria-label': 'Camp zones' }, h('ol', { class: 'zone-list' }, ...rows.map((r) => r.el)));
  return {
    el,
    render(r) {
      const line = frontier(r.zones);
      rows.forEach((row, i) => {
        const z = r.zones[i]!;
        const kind: ZoneState = z.secured ? (z.control < 1 ? 'slipping' : 'open') : i === line ? 'frontier' : 'closed';
        setAttr(row.el, 'data-state', kind);
        row.fill.style.width = `${Math.round(z.control * 100)}%`;
        const text = { open: 'OPEN', slipping: `SLIPPING ${Math.floor(z.control * 100)}%`, frontier: `PREP ${Math.floor(z.control * 100)}%`, closed: '' }[kind];
        setText(row.state, text);
      });
    },
  };
}

/** Prep against watch, one tenth per tap; the head counselor can run it. */
export function createSplit(store: LateStore): { el: HTMLElement; render(r: CampRun): void } {
  return createDial<CampRun>({
    label: 'Staff split',
    value: {
      aria: 'Prep share',
      read: (r) => {
        const total = staff(r);
        return `${isHeadCounselorActive(r) ? (total > 0 ? Math.round((prepForce(r) / total) * 100) : 0) : r.prepShare * 10}%`;
      },
    },
    less: { label: 'More on watch', onPress: () => store.dispatch({ type: 'shiftSplit', step: -1 }) },
    more: { label: 'More on prep', onPress: () => store.dispatch({ type: 'shiftSplit', step: 1 }) },
    sides: [
      { name: 'PREP', read: (r) => formatNumber(prepForce(r)) },
      { name: 'WATCH', read: (r) => `${formatNumber(Math.min(watchForce(r), watchNeeded(r)))} / ${formatNumber(watchNeeded(r))}` },
    ],
    automation: {
      text: 'HEAD COUNSELOR HAS THE ROSTER · EXACTLY ENOUGH ON WATCH',
      active: isHeadCounselorActive,
      handover: { available: (r) => r.upgrades.includes(HEAD), onToggle: () => store.dispatch({ type: 'toggleHead' }), take: 'Take the roster back', give: 'Give the roster to the head counselor' },
    },
    flags: (r) => ({ stretched: watchForce(r) < watchNeeded(r) }),
  });
}

interface Row {
  el: HTMLLIElement;
  owned: HTMLElement;
  rate: HTMLElement;
  button: HTMLButtonElement;
}

function row(name: string, description: string, action: () => void): Row {
  const owned = h('span', { class: 'item-owned', 'aria-label': `${name} owned` }, '0');
  const rate = h('span', { class: 'item-rate' });
  const button = h('button', { class: 'buy', type: 'button' });
  button.addEventListener('click', action);
  const el = h(
    'li',
    { class: 'item' },
    h('div', { class: 'item-head' }, h('span', { class: 'item-name' }, name), owned),
    h('p', { class: 'item-desc' }, description),
    h('div', { class: 'item-foot' }, rate, button),
  );
  return { el, owned, rate, button };
}

function price(r: Row, verb: string, name: string, cost: number, cash: number) {
  setText(r.button, `${verb.toUpperCase()} $${formatNumber(cost)}`);
  setAttr(r.button, 'aria-label', `${verb} ${name} for $${formatNumber(cost)}`);
  r.button.disabled = cash < cost;
}

const TOWER = 'WATCHTOWER';

/** Staff, lights and watchtowers. */
export function createStaffPanel(store: LateStore): { el: HTMLElement; render(r: CampRun): void } {
  const counselors = COUNSELORS.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'hire', id: def.id })) }));
  const lights = LIGHTS.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyLight', id: def.id })) }));
  const tower = row(TOWER, 'A platform on stilts with a lamp and a bell. Somebody should be up there. Nobody has to be.', () => store.dispatch({ type: 'buyTower' }));
  const totalStaff = h('span', { class: 'panel-sub-value' });
  const totalLight = h('span', { class: 'panel-sub-value' });
  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'STAFF & SUPPLIES'),
    h('h3', { class: 'panel-sub' }, 'LIGHT ', totalLight),
    h('ul', { class: 'item-list' }, ...lights.map((l) => l.el)),
    h('h3', { class: 'panel-sub' }, 'STAFF ', totalStaff),
    h('ul', { class: 'item-list' }, ...counselors.map((c) => c.el)),
    h('h3', { class: 'panel-sub' }, 'THE WATCH'),
    h('ul', { class: 'item-list' }, tower.el),
  );
  return {
    el,
    render(r) {
      setText(totalStaff, formatNumber(staff(r)));
      setText(totalLight, `${formatNumber(lightSupply(r))} LM`);
      for (const l of lights) {
        const shown = isLightRevealed(r, l.index);
        l.el.hidden = !shown;
        if (!shown) continue;
        const n = r.lights[l.def.id] ?? 0;
        setText(l.owned, String(n));
        setText(l.rate, `+${formatNumber(l.def.rate)} LM EA`);
        price(l, 'Buy', l.def.name, lightCost(l.def, n), r.cash);
      }
      for (const c of counselors) {
        const shown = isCounselorRevealed(r, c.index);
        c.el.hidden = !shown;
        if (!shown) continue;
        const n = r.counselors[c.def.id] ?? 0;
        setText(c.owned, String(n));
        setText(c.rate, `${formatNumber(counselorForce(r, c.def))} STAFF EA`);
        price(c, 'Hire', c.def.name, counselorCost(c.def, n), r.cash);
      }
      setText(tower.owned, String(r.towers));
      setText(tower.rate, `WATCHES ${formatNumber(r.towers > 0 ? towerWatch(r) / r.towers : towerWatch({ ...r, towers: 1 }))} EA`);
      price(tower, 'Build', TOWER, towerCost(r), r.cash);
    },
  };
}

/** The camp store: supplies and favours, bought once. */
export function createStorePanel(store: LateStore): { el: HTMLElement; render(r: CampRun): void; hasAffordable(r: CampRun): boolean } {
  const list = h('ul', { class: 'item-list' });
  const owned = h('ul', { class: 'store-owned' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'CAMP STORE'), list, h('h3', { class: 'panel-sub' }, 'BOUGHT'), owned);
  let shown = '';
  return {
    el,
    hasAffordable: (r) => availableCampUpgrades(r).some((u) => u.cost <= r.cash),
    render(r) {
      const items = availableCampUpgrades(r);
      const key = `${items.map((u) => u.id).join(',')}|${r.upgrades.length}`;
      if (key !== shown) {
        shown = key;
        list.replaceChildren(
          ...items.map((u) => {
            const buy = h('button', { class: 'buy', type: 'button', 'data-cost': u.cost, 'aria-label': `Buy ${u.name} for $${formatNumber(u.cost)}` }, `BUY $${formatNumber(u.cost)}`);
            buy.addEventListener('click', () => store.dispatch({ type: 'buyUpgrade', id: u.id }));
            return h('li', { class: 'item' }, h('div', { class: 'item-head' }, h('span', { class: 'item-name' }, u.name)), h('p', { class: 'item-desc' }, u.description), h('div', { class: 'item-foot' }, buy));
          }),
        );
        owned.replaceChildren(...CAMP_UPGRADES.filter((u) => r.upgrades.includes(u.id)).map((u) => h('li', {}, u.name)));
      }
      for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = r.cash < Number(b.dataset.cost);
    },
  };
}
