import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createFlow } from '../engine/ui/flow';
import { ASYLUM_STAFF, WARDS } from '../late-fees-data/asylum';
import { ASYLUM_UPGRADES } from '../late-fees-data/asylum-upgrades';
import {
  agitationRate,
  asylumSignals,
  availableAsylumUpgrades,
  calmCapacity,
  coverage,
  doorCost,
  incomeRate,
  isAutoSedationActive,
  isStaffRevealed,
  isWardRevealed,
  patients,
  roundsPower,
  sedationShare,
  staffCost,
  wardCost,
  wardRate,
} from '../late-fees/asylum/economy';
import { FINAL_GIRL_AT } from '../late-fees/story';
import type { AsylumRun, Run } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';
import type { VenueUi } from './venues';

const AUTO = ASYLUM_UPGRADES.find((u) => u.effect.kind === 'autoSedation')!.id;
const a = (r: Run) => r as AsylumRun;
/** The film opens this many days before Candy Corn Day; the countdown runs with the story. */
const DAYS_BEFORE = 29;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Days left until Candy Corn Day, counted down by the story (it arrives with act 3); then, who is still out there. */
function calendar(r: AsylumRun): string {
  if (r.act >= 3) return `TODAY · ${r.loose} LOOSE`;
  const days = Math.max(1, Math.ceil(DAYS_BEFORE * (1 - asylumSignals(r).progress / FINAL_GIRL_AT)));
  return `${days} DAYS`;
}

/** The dose, one notch per tap; agitation and the inspector beside it; the pharmacy can take it. */
function createDoseDial(store: LateStore): { el: HTMLElement; render(r: AsylumRun): void } {
  return createDial<AsylumRun>({
    label: 'Sedation dial',
    value: { aria: 'Sedation', read: (r) => pct(sedationShare(r)) },
    less: { label: 'Less sedation', onPress: () => store.dispatch({ type: 'shiftSedation', step: -1 }) },
    more: { label: 'More sedation', onPress: () => store.dispatch({ type: 'shiftSedation', step: 1 }) },
    sides: [
      { name: 'CALM', read: (r) => `${pct(coverage(r))} OF ${formatNumber(patients(r))}` },
      { name: 'INSPECTOR', aria: "Inspector's rating", read: (r) => pct(r.rating) },
    ],
    meter: { name: 'AGITATION (AN INCIDENT AT 100%)', aria: 'Agitation', read: (r) => r.agitation, text: (r) => pct(r.agitation) },
    automation: {
      text: 'THE PHARMACY HAS THE DIAL · JUST ENOUGH TO KEEP THE WARDS CALM',
      active: isAutoSedationActive,
      handover: { available: (r) => r.upgrades.includes(AUTO), onToggle: () => store.dispatch({ type: 'toggleSedation' }), take: 'Take the dial back', give: 'Give the dial to the pharmacy' },
    },
    flags: (r) => ({ stretched: agitationRate(r) > 0, debt: r.agitation > 0.7 ? 'high' : 'ok' }),
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

const DOOR = 'SECURITY DOOR';

/** Beds, ward staff and the doors that hold. */
function createWards(store: LateStore): { el: HTMLElement; render(r: AsylumRun): void } {
  const wards = WARDS.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyWard', id: def.id })) }));
  const staffRows = ASYLUM_STAFF.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'hireAsylumStaff', id: def.id })) }));
  const door = row(DOOR, 'A steel door with a wired-glass window. It holds one bad night, and then it has to be replaced. Better locks make it last.', () =>
    store.dispatch({ type: 'buyDoor' }),
  );
  const totalBeds = h('span', { class: 'panel-sub-value' });
  const totalCalm = h('span', { class: 'panel-sub-value' });
  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'THE WARDS'),
    h('h3', { class: 'panel-sub' }, 'STAFF ', totalCalm),
    h('ul', { class: 'item-list' }, ...staffRows.map((s) => s.el)),
    h('h3', { class: 'panel-sub' }, 'BEDS ', totalBeds),
    h('ul', { class: 'item-list' }, ...wards.map((w) => w.el)),
    h('h3', { class: 'panel-sub' }, 'SECURITY'),
    h('ul', { class: 'item-list' }, door.el),
  );
  return {
    el,
    render(r) {
      setText(totalBeds, `${formatNumber(patients(r))} PATIENTS`);
      setText(totalCalm, `CALMING ${formatNumber(calmCapacity(r))}`);
      for (const w of wards) {
        const shown = isWardRevealed(r, w.index);
        w.el.hidden = !shown;
        if (!shown) continue;
        const n = r.wards[w.def.id] ?? 0;
        setText(w.owned, String(n));
        setText(w.rate, `$${formatNumber(wardRate(r, w.def))}/S EA`);
        price(w, 'Fill', w.def.name, wardCost(w.def, n), r.cash);
      }
      for (const s of staffRows) {
        const shown = isStaffRevealed(r, s.index);
        s.el.hidden = !shown;
        if (!shown) continue;
        const n = r.staff[s.def.id] ?? 0;
        setText(s.owned, String(n));
        setText(s.rate, `CALMS ${formatNumber(s.def.calms)} EA`);
        price(s, 'Hire', s.def.name, staffCost(s.def, n), r.cash);
      }
      setText(door.owned, String(r.doors));
      setText(door.rate, r.doors > 0 ? `${r.doors} STANDING` : 'NONE STANDING');
      price(door, 'Fit', DOOR, doorCost(r), r.cash);
    },
  };
}

function createAsylumStore(store: LateStore): { el: HTMLElement; render(r: AsylumRun): void; hasAffordable(r: AsylumRun): boolean } {
  const list = h('ul', { class: 'item-list' });
  const owned = h('ul', { class: 'store-owned' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'HOSPITAL SUPPLIES'), list, h('h3', { class: 'panel-sub' }, 'BOUGHT'), owned);
  let shown = '';
  return {
    el,
    hasAffordable: (r) => availableAsylumUpgrades(r).some((u) => u.cost <= r.cash),
    render(r) {
      const items = availableAsylumUpgrades(r);
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
        owned.replaceChildren(...ASYLUM_UPGRADES.filter((u) => r.upgrades.includes(u.id)).map((u) => h('li', {}, u.name)));
      }
      for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = r.cash < Number(b.dataset.cost);
    },
  };
}

export function createAsylumUi(store: LateStore): VenueUi {
  const flow = createFlow<AsylumRun>({
    cells: [
      { label: 'CALM', aria: 'Calm', unit: 'KEPT' },
      { label: 'PATIENTS', aria: 'Patients', unit: 'BEDS' },
      { label: 'FUNDING', aria: 'State funding', unit: '$/S' },
    ],
    meterLabel: 'Wards kept calm',
    rateUnit: '$/S',
    identity: (r) => `${r.config.title}:${r.seed}`,
    read: (r) => {
      const n = patients(r);
      const cover = coverage(r);
      const base = {
        values: [Math.round(cover * n), n, incomeRate(r)] as [number, number, number],
        meter: cover * 100,
        rate: incomeRate(r),
      };
      if (n === 0) return { ...base, limit: 'beds', highlight: 1, severe: false, note: 'NO PATIENTS · WALK THE WARDS OR FILL BEDS' };
      if (r.agitation > 0.7 || agitationRate(r) > 0) {
        return { ...base, limit: 'calm', highlight: 0, severe: r.agitation > 0.7, note: `WARDS AGITATED · ${pct(r.agitation)} · HIRE STAFF, RAISE THE DOSE OR FIT DOORS` };
      }
      if (r.rating < 0.6) return { ...base, limit: 'inspector', highlight: 2, severe: true, note: `THE INSPECTOR RATES THE HOSPITAL ${pct(r.rating)} · FUNDING CUT · EASE THE DOSE` };
      if (r.loose > 0) return { ...base, limit: 'loose', highlight: 2, severe: true, note: `${r.loose} LOOSE IN MILLBROOK · THE SEARCH GOES ON` };
      return { ...base, limit: 'beds', highlight: 1, severe: false, note: 'THE WARDS ARE QUIET · FILL MORE BEDS' };
    },
  });
  const dial = createDoseDial(store);
  const wards = createWards(store);
  const shop = createAsylumStore(store);
  return {
    flow: { el: flow.el, render: (r) => flow.render(a(r)) },
    clock: { label: 'CANDY CORN DAY', aria: 'Days to Candy Corn Day', read: (r) => calendar(a(r)) },
    action: { label: 'WALK THE WARDS', aria: 'Walk the wards', action: { type: 'rounds' }, perPress: (r) => roundsPower(a(r)) },
    main: { el: h('div', { class: 'venue-main' }, dial.el), render: (r) => dial.render(a(r)) },
    staffTab: 'WARDS',
    staff: { el: wards.el, render: (r) => wards.render(a(r)) },
    store: { el: shop.el, render: (r) => shop.render(a(r)), hasAffordable: (r) => shop.hasAffordable(a(r)) },
    night: (r) => patients(a(r)) > 0,
  };
}
