import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h } from '../engine/ui/dom';
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
import { createShop } from '../engine/ui/shop';
import { DOLLARS, LISTS, unit } from './currency';
import { createBuyPanel } from '../engine/ui/buy-list';

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

const SUPPRESSANT = 'SUPPRESSANT';

function createWard(store: LateStore): { el: HTMLElement; render(r: ClinicRun): void } {
  return createBuyPanel<ClinicRun>({
    ...LISTS,
    title: 'THE WARD',
    funds: (r) => r.cash,
    sections: [
      {
        heading: 'NIGHT STAFF',
        total: (r) => `WATCHING ${formatNumber(watchCapacity(r))}`,
        items: STAFF.map((def, index) =>
          unit<ClinicRun>(def, {
            verb: 'Hire',
            owned: (r) => r.staff[def.id] ?? 0,
            price: (r) => staffCost(def, r.staff[def.id] ?? 0),
            each: () => `WATCHES ${formatNumber(def.watches)} EA`,
            shown: (r) => isStaffRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'hireStaff', id: def.id }),
          }),
        ),
      },
      {
        heading: 'BEDS',
        total: (r) => `${formatNumber(patients(r))} PATIENTS`,
        items: BEDS.map((def, index) =>
          unit<ClinicRun>(def, {
            verb: 'Buy',
            owned: (r) => r.beds[def.id] ?? 0,
            price: (r) => bedCost(def, r.beds[def.id] ?? 0),
            each: (r) => `$${formatNumber(bedRate(r, def))}/S EA ASLEEP`,
            shown: (r) => isBedRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'buyBed', id: def.id }),
          }),
        ),
      },
      {
        heading: 'THE PHARMACY',
        items: [
          unit<ClinicRun>(
            { id: 'suppressant', name: SUPPRESSANT, description: 'An experimental drug that blocks dreaming without stopping sleep. The grant-holder rations it, and asks why you need more.' },
            {
              verb: 'Request',
              owned: (r) => r.suppressant,
              price: suppressantCost,
              each: (r) => `PROTECTS ${formatNumber(protectedCount(r))} NOW`,
              onBuy: () => store.dispatch({ type: 'buySuppressant' }),
            },
          ),
        ],
      },
    ],
  });
}

function createClinicStore(store: LateStore): { el: HTMLElement; render(r: ClinicRun): void; hasAffordable(r: ClinicRun): boolean } {
  return createShop<ClinicRun, (typeof CLINIC_UPGRADES)[number]>({
    title: 'CLINIC SUPPLIES',
    all: CLINIC_UPGRADES,
    available: availableClinicUpgrades,
    owned: (r) => r.upgrades,
    funds: (r) => r.cash,
    currency: DOLLARS,
    onBuy: (id) => store.dispatch({ type: 'buyUpgrade', id }),
    className: 'item',
    rowClass: 'item',
    headingClass: 'panel-sub',
  });
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
