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
  const share = h('span', { class: 'split-share', 'aria-label': 'Prep share' }, '0%');
  const toWatch = h('button', { class: 'split-step', type: 'button', 'aria-label': 'More on watch' }, '−');
  const toPrep = h('button', { class: 'split-step', type: 'button', 'aria-label': 'More on prep' }, '+');
  toWatch.addEventListener('click', () => store.dispatch({ type: 'shiftSplit', step: -1 }));
  toPrep.addEventListener('click', () => store.dispatch({ type: 'shiftSplit', step: 1 }));
  const prep = h('span', { class: 'split-figure' });
  const watch = h('span', { class: 'split-figure' });
  const auto = h('p', { class: 'split-auto' }, 'HEAD COUNSELOR HAS THE ROSTER · EXACTLY ENOUGH ON WATCH');
  const handover = h('button', { class: 'split-handover', type: 'button' });
  handover.addEventListener('click', () => store.dispatch({ type: 'toggleHead' }));
  const el = h(
    'section',
    { class: 'split', 'aria-label': 'Staff split' },
    h(
      'div',
      { class: 'split-row' },
      h('div', { class: 'split-side' }, h('span', { class: 'split-name' }, 'PREP'), prep),
      h('div', { class: 'split-steps' }, toWatch, share, toPrep),
      h('div', { class: 'split-side split-side-watch' }, h('span', { class: 'split-name' }, 'WATCH'), watch),
    ),
    auto,
    handover,
  );
  return {
    el,
    render(r) {
      const automated = isHeadCounselorActive(r);
      const total = staff(r);
      setText(share, `${automated ? (total > 0 ? Math.round((prepForce(r) / total) * 100) : 0) : r.prepShare * 10}%`);
      setText(prep, formatNumber(prepForce(r)));
      const need = watchNeeded(r);
      setText(watch, `${formatNumber(Math.min(watchForce(r), need))} / ${formatNumber(need)}`);
      el.dataset.stretched = String(watchForce(r) < need);
      auto.hidden = !automated;
      toWatch.hidden = automated;
      toPrep.hidden = automated;
      handover.hidden = !r.upgrades.includes(HEAD);
      const label = automated ? 'Take the roster back' : 'Give the roster to the head counselor';
      setText(handover, label.toUpperCase());
      handover.setAttribute('aria-label', label);
    },
  };
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
