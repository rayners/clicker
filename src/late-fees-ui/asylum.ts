import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h } from '../engine/ui/dom';
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
import { createShop } from '../engine/ui/shop';
import { DOLLARS, LISTS, unit } from './currency';
import { createBuyPanel } from '../engine/ui/buy-list';

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

const DOOR = 'SECURITY DOOR';

function createWards(store: LateStore): { el: HTMLElement; render(r: AsylumRun): void } {
  return createBuyPanel<AsylumRun>({
    ...LISTS,
    title: 'THE WARDS',
    funds: (r) => r.cash,
    sections: [
      {
        heading: 'STAFF',
        total: (r) => `CALMING ${formatNumber(calmCapacity(r))}`,
        items: ASYLUM_STAFF.map((def, index) =>
          unit<AsylumRun>(def, {
            verb: 'Hire',
            owned: (r) => r.staff[def.id] ?? 0,
            price: (r) => staffCost(def, r.staff[def.id] ?? 0),
            each: () => `CALMS ${formatNumber(def.calms)} EA`,
            shown: (r) => isStaffRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'hireAsylumStaff', id: def.id }),
          }),
        ),
      },
      {
        heading: 'BEDS',
        total: (r) => `${formatNumber(patients(r))} PATIENTS`,
        items: WARDS.map((def, index) =>
          unit<AsylumRun>(def, {
            verb: 'Fill',
            owned: (r) => r.wards[def.id] ?? 0,
            price: (r) => wardCost(def, r.wards[def.id] ?? 0),
            each: (r) => `$${formatNumber(wardRate(r, def))}/S EA`,
            shown: (r) => isWardRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'buyWard', id: def.id }),
          }),
        ),
      },
      {
        heading: 'SECURITY',
        items: [
          unit<AsylumRun>(
            { id: 'door', name: DOOR, description: 'A steel door with a wired-glass window. It holds one bad night, and then it has to be replaced. Better locks make it last.' },
            {
              verb: 'Fit',
              owned: (r) => r.doors,
              price: doorCost,
              each: (r) => (r.doors > 0 ? `${r.doors} STANDING` : 'NONE STANDING'),
              onBuy: () => store.dispatch({ type: 'buyDoor' }),
            },
          ),
        ],
      },
    ],
  });
}

function createAsylumStore(store: LateStore): { el: HTMLElement; render(r: AsylumRun): void; hasAffordable(r: AsylumRun): boolean } {
  return createShop<AsylumRun, (typeof ASYLUM_UPGRADES)[number]>({
    title: 'HOSPITAL SUPPLIES',
    all: ASYLUM_UPGRADES,
    available: availableAsylumUpgrades,
    owned: (r) => r.upgrades,
    funds: (r) => r.cash,
    currency: DOLLARS,
    onBuy: (id) => store.dispatch({ type: 'buyUpgrade', id }),
    className: 'item',
    rowClass: 'item',
    headingClass: 'panel-sub',
  });
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
