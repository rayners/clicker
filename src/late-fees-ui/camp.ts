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
import { createShop } from '../engine/ui/shop';
import { DOLLARS, LISTS, unit } from './currency';
import { createBuyPanel } from '../engine/ui/buy-list';

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

const TOWER = 'WATCHTOWER';

/** Staff, lights and watchtowers. */
export function createStaffPanel(store: LateStore): { el: HTMLElement; render(r: CampRun): void } {
  return createBuyPanel<CampRun>({
    ...LISTS,
    title: 'STAFF & SUPPLIES',
    funds: (r) => r.cash,
    sections: [
      {
        heading: 'LIGHT',
        total: (r) => `${formatNumber(lightSupply(r))} LM`,
        items: LIGHTS.map((def, index) =>
          unit<CampRun>(def, {
            verb: 'Buy',
            owned: (r) => r.lights[def.id] ?? 0,
            price: (r) => lightCost(def, r.lights[def.id] ?? 0),
            each: () => `+${formatNumber(def.rate)} LM EA`,
            shown: (r) => isLightRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'buyLight', id: def.id }),
          }),
        ),
      },
      {
        heading: 'STAFF',
        total: (r) => formatNumber(staff(r)),
        items: COUNSELORS.map((def, index) =>
          unit<CampRun>(def, {
            verb: 'Hire',
            owned: (r) => r.counselors[def.id] ?? 0,
            price: (r) => counselorCost(def, r.counselors[def.id] ?? 0),
            each: (r) => `${formatNumber(counselorForce(r, def))} STAFF EA`,
            shown: (r) => isCounselorRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'hire', id: def.id }),
          }),
        ),
      },
      {
        heading: 'THE WATCH',
        items: [
          unit<CampRun>(
            { id: 'tower', name: TOWER, description: 'A platform on stilts with a lamp and a bell. Somebody should be up there. Nobody has to be.' },
            {
              verb: 'Build',
              owned: (r) => r.towers,
              price: towerCost,
              each: (r) => `WATCHES ${formatNumber(r.towers > 0 ? towerWatch(r) / r.towers : towerWatch({ ...r, towers: 1 }))} EA`,
              onBuy: () => store.dispatch({ type: 'buyTower' }),
            },
          ),
        ],
      },
    ],
  });
}

/** The camp store: supplies and favours, bought once. */
export function createStorePanel(store: LateStore): { el: HTMLElement; render(r: CampRun): void; hasAffordable(r: CampRun): boolean } {
  return createShop<CampRun, (typeof CAMP_UPGRADES)[number]>({
    title: 'CAMP STORE',
    all: CAMP_UPGRADES,
    available: availableCampUpgrades,
    owned: (r) => r.upgrades,
    funds: (r) => r.cash,
    currency: DOLLARS,
    onBuy: (id) => store.dispatch({ type: 'buyUpgrade', id }),
    className: 'item',
    rowClass: 'item',
    headingClass: 'panel-sub',
  });
}
