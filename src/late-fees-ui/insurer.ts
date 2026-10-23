import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { createFlow } from '../engine/ui/flow';
import { AGENTS, POLICIES } from '../late-fees-data/insurer';
import { INSURER_UPGRADES } from '../late-fees-data/insurer-upgrades';
import {
  agentCost,
  appetite,
  availableInsurerUpgrades,
  incomeRate,
  isActuaryActive,
  isAgentRevealed,
  isHeld,
  isPolicyRevealed,
  omenRate,
  policyCost,
  policyRate,
  prevention,
  salePower,
} from '../late-fees/insurer/economy';
import type { InsurerRun, Run } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';
import type { VenueUi } from './venues';
import { createShop } from '../engine/ui/shop';
import { DOLLARS, LISTS, unit } from './currency';
import { createBuyPanel } from '../engine/ui/buy-list';

const MAINFRAME = INSURER_UPGRADES.find((u) => u.effect.kind === 'actuary')!.id;
/** Omens per second are tiny early on; show them as percent of a death per minute. */
const perMinute = (omensPerSecond: number) => omensPerSecond * 100 * 60;
const i = (r: Run) => r as InsurerRun;

/** The risk-appetite dial: more premium, and a bigger business for Death to notice. */
function createAppetite(store: LateStore): { el: HTMLElement; render(r: InsurerRun): void } {
  return createDial<InsurerRun>({
    label: 'Risk appetite dial',
    value: { aria: 'Risk appetite', read: (r) => `${appetite(r) * 10}%` },
    less: { label: 'Less risk', onPress: () => store.dispatch({ type: 'shiftAppetite', step: -1 }) },
    more: { label: 'More risk', onPress: () => store.dispatch({ type: 'shiftAppetite', step: 1 }) },
    sides: [
      { name: 'PREMIUMS', read: (r) => `$${formatNumber(incomeRate(r))}/S` },
      { name: 'THE DESIGN', read: (r) => `${formatNumber(perMinute(omenRate(r)))} / ${formatNumber(perMinute(prevention(r)))} %/MIN` },
    ],
    automation: {
      text: 'THE ACTUARIAL MAINFRAME SETS THE APPETITE · AS HIGH AS PREVENTION CAN KEEP UP WITH',
      active: isActuaryActive,
      handover: { available: (r) => r.upgrades.includes(MAINFRAME), onToggle: () => store.dispatch({ type: 'toggleActuary' }), take: 'Take the appetite back', give: 'Give the appetite to the mainframe' },
    },
    flags: (r) => ({ stretched: !isHeld(r) && r.list.length > 0 && omenRate(r) > 0 }),
  });
}

/** The list: who is next, how close the design is to finishing them, and how long until it has to move on. */
function createList(): { el: HTMLElement; render(r: InsurerRun): void } {
  const next = h('p', { class: 'list-next' });
  const omens = h('span', { class: 'debt-value', 'aria-label': 'Omens' }, '0%');
  const fill = h('i', { class: 'debt-fill' });
  const clock = h('p', { class: 'list-clock' });
  const left = h('p', { class: 'list-left' });
  const names = h('ol', { class: 'list-names' });
  const el = h(
    'section',
    { class: 'death-list', 'aria-label': 'The list' },
    next,
    h('div', { class: 'debt' }, h('span', { class: 'split-name' }, 'OMENS'), omens, h('span', { class: 'debt-bar', 'aria-hidden': 'true' }, fill)),
    clock,
    left,
    names,
  );
  let shown = '';
  return {
    el,
    render(r) {
      const target = r.list[0];
      setText(next, target ? `NEXT: ${target}` : 'THE LIST IS EMPTY. FOR NOW.');
      setText(omens, `${Math.round(r.omens * 100)}%`);
      fill.style.width = `${Math.round(r.omens * 100)}%`;
      el.dataset.danger = r.omens > 0.66 ? 'high' : 'ok';
      setText(clock, !target ? '' : isHeld(r) ? `HELD · THE DESIGN SKIPS ${target} IN ${Math.ceil(r.dueIn)}S` : 'NOT HELD · THE OMENS ARE BUILDING');
      setText(left, `${r.list.length} NAMES ON THE LIST · SKIPPED ${r.cheats} TIMES`);
      const key = r.list.slice(1, 6).join(',');
      if (key !== shown) {
        shown = key;
        names.replaceChildren(...r.list.slice(1, 6).map((n) => h('li', {}, n)));
      }
    },
  };
}

function createOffice(store: LateStore): { el: HTMLElement; render(r: InsurerRun): void } {
  return createBuyPanel<InsurerRun>({
    ...LISTS,
    title: 'THE OFFICE',
    funds: (r) => r.cash,
    sections: [
      {
        heading: 'PREVENTION',
        total: (r) => `BREAKING ${formatNumber(perMinute(prevention(r)))}%/MIN`,
        items: AGENTS.map((def, index) =>
          unit<InsurerRun>(def, {
            verb: 'Hire',
            owned: (r) => r.agents[def.id] ?? 0,
            price: (r) => agentCost(def, r.agents[def.id] ?? 0),
            each: () => `BREAKS ${formatNumber(perMinute(def.power))}%/MIN EA`,
            shown: (r) => isAgentRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'hireAgent', id: def.id }),
          }),
        ),
      },
      {
        heading: 'POLICIES',
        total: (r) => `$${formatNumber(incomeRate(r))}/S`,
        items: POLICIES.map((def, index) =>
          unit<InsurerRun>(def, {
            verb: 'Write',
            owned: (r) => r.policies[def.id] ?? 0,
            price: (r) => policyCost(def, r.policies[def.id] ?? 0),
            each: (r) => `$${formatNumber(policyRate(r, def))}/S EA`,
            shown: (r) => isPolicyRevealed(r, index),
            onBuy: () => store.dispatch({ type: 'buyPolicy', id: def.id }),
          }),
        ),
      },
    ],
  });
}

function createInsurerStore(store: LateStore): { el: HTMLElement; render(r: InsurerRun): void; hasAffordable(r: InsurerRun): boolean } {
  return createShop<InsurerRun, (typeof INSURER_UPGRADES)[number]>({
    title: 'COMPANY SUPPLIES',
    all: INSURER_UPGRADES,
    available: availableInsurerUpgrades,
    owned: (r) => r.upgrades,
    funds: (r) => r.cash,
    currency: DOLLARS,
    onBuy: (id) => store.dispatch({ type: 'buyUpgrade', id }),
    className: 'item',
    rowClass: 'item',
    headingClass: 'panel-sub',
  });
}

export function createInsurerUi(store: LateStore): VenueUi {
  const flow = createFlow<InsurerRun>({
    cells: [
      { label: 'PREVENT', aria: 'Prevention', unit: '%/MIN' },
      { label: 'DESIGN', aria: "Death's design", unit: '%/MIN' },
      { label: 'PREMIUM', aria: 'Premiums', unit: '$/S' },
    ],
    meterLabel: 'Omens on the next name',
    rateUnit: '$/S',
    identity: (r) => `${r.config.title}:${r.seed}`,
    read: (r) => {
      const p = prevention(r);
      const d = omenRate(r);
      const base = { values: [perMinute(p), perMinute(d), incomeRate(r)] as [number, number, number], meter: r.omens * 100, rate: incomeRate(r) };
      if (incomeRate(r) === 0) return { ...base, limit: 'policies', highlight: 2, severe: false, note: 'NO POLICIES · SELL BY HAND OR WRITE POLICIES' };
      if (r.list.length > 0 && d > p) {
        return { ...base, limit: 'design', highlight: 0, severe: true, note: `THE DESIGN IS OUTRUNNING PREVENTION · ${r.list[0]} IS NEXT · HIRE PREVENTION OR CUT RISK` };
      }
      return { ...base, limit: 'policies', highlight: 2, severe: false, note: r.list.length > 0 ? `HOLDING ${r.list[0]} · WRITE MORE POLICIES` : 'THE LIST IS EMPTY · WRITE MORE POLICIES' };
    },
  });
  const dial = createAppetite(store);
  const list = createList();
  const office = createOffice(store);
  const shop = createInsurerStore(store);
  return {
    flow: { el: flow.el, render: (r) => flow.render(i(r)) },
    clock: { label: 'THE LIST', aria: 'Names on the list', read: (r) => `${i(r).list.length} NAMES` },
    action: { label: 'SELL A POLICY', aria: 'Sell a policy', action: { type: 'sell' }, perPress: (r) => salePower(i(r)) },
    main: {
      el: h('div', { class: 'venue-main' }, dial.el, list.el),
      render: (r) => {
        dial.render(i(r));
        list.render(i(r));
      },
    },
    staffTab: 'OFFICE',
    staff: { el: office.el, render: (r) => office.render(i(r)) },
    store: { el: shop.el, render: (r) => shop.render(i(r)), hasAffordable: (r) => shop.hasAffordable(i(r)) },
    // The design never sleeps: the tape is always recording.
    night: (r) => POLICIES.some((p) => (i(r).policies[p.id] ?? 0) > 0),
  };
}
