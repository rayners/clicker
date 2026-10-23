import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createFlow } from '../engine/ui/flow';
import { BEDS, STAFF } from '../late-fees-data/clinic';
import { CLINIC_UPGRADES } from '../late-fees-data/clinic-upgrades';
import {
  availableClinicUpgrades,
  bedCost,
  bedRate,
  exposed,
  incomeRate,
  isAutoDialActive,
  isBedRevealed,
  isStaffRevealed,
  patients,
  protectedCount,
  readingPower,
  remFraction,
  remPatients,
  staffCost,
  suppressantCost,
  watchCapacity,
  REM_NEED,
} from '../late-fees/clinic/economy';
import type { ClinicRun, Run } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';
import type { VenueUi } from './venues';

const AUTO = CLINIC_UPGRADES.find((u) => u.effect.kind === 'autoDial')!.id;
const c = (r: Run) => r as ClinicRun;

/** Light against deep sleep, one tenth per tap; sleep debt; automated monitoring can take it. */
function createRemDial(store: LateStore): { el: HTMLElement; render(r: ClinicRun): void } {
  return createDial<ClinicRun>({
    label: 'Deep-sleep dial',
    value: { aria: 'Deep sleep share', read: (r) => `${Math.round(remFraction(r) * 100)}%` },
    less: { label: 'Less deep sleep', onPress: () => store.dispatch({ type: 'shiftRem', step: -1 }) },
    more: { label: 'More deep sleep', onPress: () => store.dispatch({ type: 'shiftRem', step: 1 }) },
    sides: [
      // People are whole: round the deep sleepers, and the rest are in light sleep.
      { name: 'LIGHT SLEEP', read: (r) => formatNumber(patients(r) - Math.round(remPatients(r))) },
      {
        name: 'DEEP SLEEP',
        read: (r) => {
          const asleep = Math.round(remPatients(r));
          return `${formatNumber(asleep)} · ${formatNumber(Math.min(asleep, Math.floor(watchCapacity(r) + protectedCount(r))))} WATCHED`;
        },
      },
    ],
    meter: { name: `SLEEP DEBT (NEEDS ${Math.round(REM_NEED * 100)}% DEEP)`, aria: 'Sleep debt', read: (r) => r.debt / 2, text: (r) => `${Math.round(r.debt * 100)}%` },
    automation: {
      text: 'AUTOMATED MONITORING HAS THE DIAL · AS DEEP AS THE WATCH ALLOWS',
      active: isAutoDialActive,
      handover: { available: (r) => r.upgrades.includes(AUTO), onToggle: () => store.dispatch({ type: 'toggleDial' }), take: 'Take the dial back', give: 'Give the dial to automated monitoring' },
    },
    flags: (r) => ({ stretched: exposed(r) > 0, debt: r.debt > 1 ? 'high' : 'ok' }),
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

const SUPPRESSANT = 'SUPPRESSANT';

/** Beds, night staff and the rationed suppressant. */
function createWard(store: LateStore): { el: HTMLElement; render(r: ClinicRun): void } {
  const beds = BEDS.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyBed', id: def.id })) }));
  const staffRows = STAFF.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'hireStaff', id: def.id })) }));
  const suppressant = row(
    'DREAM SUPPRESSANT',
    'An experimental drug that blocks dreaming without stopping sleep. The grant-holder rations it, and asks why you need more.',
    () => store.dispatch({ type: 'buySuppressant' }),
  );
  const totalBeds = h('span', { class: 'panel-sub-value' });
  const totalWatch = h('span', { class: 'panel-sub-value' });
  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'THE WARD'),
    h('h3', { class: 'panel-sub' }, 'NIGHT STAFF ', totalWatch),
    h('ul', { class: 'item-list' }, ...staffRows.map((s) => s.el)),
    h('h3', { class: 'panel-sub' }, 'BEDS ', totalBeds),
    h('ul', { class: 'item-list' }, ...beds.map((b) => b.el)),
    h('h3', { class: 'panel-sub' }, 'THE PHARMACY'),
    h('ul', { class: 'item-list' }, suppressant.el),
  );
  return {
    el,
    render(r) {
      setText(totalBeds, `${formatNumber(patients(r))} PATIENTS`);
      setText(totalWatch, `WATCHING ${formatNumber(watchCapacity(r))}`);
      for (const b of beds) {
        const shown = isBedRevealed(r, b.index);
        b.el.hidden = !shown;
        if (!shown) continue;
        const n = r.beds[b.def.id] ?? 0;
        setText(b.owned, String(n));
        setText(b.rate, `$${formatNumber(bedRate(r, b.def))}/S EA ASLEEP`);
        price(b, 'Buy', b.def.name, bedCost(b.def, n), r.cash);
      }
      for (const s of staffRows) {
        const shown = isStaffRevealed(r, s.index);
        s.el.hidden = !shown;
        if (!shown) continue;
        const n = r.staff[s.def.id] ?? 0;
        setText(s.owned, String(n));
        setText(s.rate, `WATCHES ${formatNumber(s.def.watches)} EA`);
        price(s, 'Hire', s.def.name, staffCost(s.def, n), r.cash);
      }
      setText(suppressant.owned, String(r.suppressant));
      setText(suppressant.rate, `PROTECTS ${formatNumber(protectedCount(r))} NOW`);
      price(suppressant, 'Request', SUPPRESSANT, suppressantCost(r), r.cash);
    },
  };
}

function createClinicStore(store: LateStore): { el: HTMLElement; render(r: ClinicRun): void; hasAffordable(r: ClinicRun): boolean } {
  const list = h('ul', { class: 'item-list' });
  const owned = h('ul', { class: 'store-owned' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'CLINIC SUPPLIES'), list, h('h3', { class: 'panel-sub' }, 'BOUGHT'), owned);
  let shown = '';
  return {
    el,
    hasAffordable: (r) => availableClinicUpgrades(r).some((u) => u.cost <= r.cash),
    render(r) {
      const items = availableClinicUpgrades(r);
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
        owned.replaceChildren(...CLINIC_UPGRADES.filter((u) => r.upgrades.includes(u.id)).map((u) => h('li', {}, u.name)));
      }
      for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = r.cash < Number(b.dataset.cost);
    },
  };
}

export function createClinicUi(store: LateStore): VenueUi {
  const flow = createFlow<ClinicRun>({
    cells: [
      { label: 'WATCH', aria: 'Watch', unit: 'BEDS' },
      { label: 'DEEP', aria: 'Deep sleepers', unit: 'PATIENTS' },
      { label: 'GRANT', aria: 'Grant money', unit: '$/S' },
    ],
    meterLabel: 'Deep sleepers watched',
    rateUnit: '$/S',
    identity: (r) => `${r.config.title}:${r.seed}`,
    read: (r) => {
      const cover = watchCapacity(r) + protectedCount(r);
      const deep = remPatients(r);
      const base = {
        values: [Math.floor(cover), Math.round(deep), incomeRate(r)] as [number, number, number],
        meter: deep === 0 ? 100 : Math.min(100, (cover / deep) * 100),
        rate: incomeRate(r),
      };
      if (patients(r) === 0) return { ...base, limit: 'beds', highlight: 1, severe: false, note: 'NO PATIENTS · TAKE READINGS OR BUY BEDS' };
      if (r.debt > 1) return { ...base, limit: 'debt', highlight: 1, severe: true, note: 'SLEEP DEBT · PATIENTS NODDING OFF UNWATCHED · ALLOW MORE DEEP SLEEP' };
      if (exposed(r) > 0) {
        const alone = Math.max(1, Math.round(exposed(r)));
        return { ...base, limit: 'watch', highlight: 0, severe: true, note: `${alone} DEEP SLEEPER${alone === 1 ? '' : 'S'} UNWATCHED · HE IS IN THEIR DREAMS · HIRE NIGHT STAFF` };
      }
      return { ...base, limit: 'beds', highlight: 1, severe: false, note: `${Math.floor(cover - deep)} SPARE WATCH · DEEPEN THE DIAL OR ADD BEDS` };
    },
  });
  const dial = createRemDial(store);
  const ward = createWard(store);
  const shop = createClinicStore(store);
  return {
    flow: { el: flow.el, render: (r) => flow.render(c(r)) },
    clock: { label: 'SLEEP DEBT', aria: 'Clinic sleep debt', read: (r) => `${Math.round(c(r).debt * 100)}%` },
    action: { label: 'TAKE A READING', aria: 'Take a reading', action: { type: 'reading' }, perPress: (r) => readingPower(c(r)) },
    main: { el: h('div', { class: 'venue-main' }, dial.el), render: (r) => dial.render(c(r)) },
    staffTab: 'WARD',
    staff: { el: ward.el, render: (r) => ward.render(c(r)) },
    store: { el: shop.el, render: (r) => shop.render(c(r)), hasAffordable: (r) => shop.hasAffordable(c(r)) },
    night: (r) => patients(c(r)) > 0,
  };
}
