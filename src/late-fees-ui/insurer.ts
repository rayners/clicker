import { createDial } from '../engine/ui/dial';
import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
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

/** Policies to write and prevention to hire. */
function createOffice(store: LateStore): { el: HTMLElement; render(r: InsurerRun): void } {
  const policies = POLICIES.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'buyPolicy', id: def.id })) }));
  const agents = AGENTS.map((def, index) => ({ def, index, ...row(def.name, def.description, () => store.dispatch({ type: 'hireAgent', id: def.id })) }));
  const totalPrevention = h('span', { class: 'panel-sub-value' });
  const totalBook = h('span', { class: 'panel-sub-value' });
  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'THE OFFICE'),
    h('h3', { class: 'panel-sub' }, 'PREVENTION ', totalPrevention),
    h('ul', { class: 'item-list' }, ...agents.map((a) => a.el)),
    h('h3', { class: 'panel-sub' }, 'POLICIES ', totalBook),
    h('ul', { class: 'item-list' }, ...policies.map((p) => p.el)),
  );
  return {
    el,
    render(r) {
      setText(totalPrevention, `BREAKING ${formatNumber(perMinute(prevention(r)))}%/MIN`);
      setText(totalBook, `$${formatNumber(incomeRate(r))}/S`);
      for (const a of agents) {
        const shown = isAgentRevealed(r, a.index);
        a.el.hidden = !shown;
        if (!shown) continue;
        const n = r.agents[a.def.id] ?? 0;
        setText(a.owned, String(n));
        setText(a.rate, `BREAKS ${formatNumber(perMinute(a.def.power))}%/MIN EA`);
        price(a, 'Hire', a.def.name, agentCost(a.def, n), r.cash);
      }
      for (const p of policies) {
        const shown = isPolicyRevealed(r, p.index);
        p.el.hidden = !shown;
        if (!shown) continue;
        const n = r.policies[p.def.id] ?? 0;
        setText(p.owned, String(n));
        setText(p.rate, `$${formatNumber(policyRate(r, p.def))}/S EA`);
        price(p, 'Write', p.def.name, policyCost(p.def, n), r.cash);
      }
    },
  };
}

function createInsurerStore(store: LateStore): { el: HTMLElement; render(r: InsurerRun): void; hasAffordable(r: InsurerRun): boolean } {
  const list = h('ul', { class: 'item-list' });
  const owned = h('ul', { class: 'store-owned' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'COMPANY SUPPLIES'), list, h('h3', { class: 'panel-sub' }, 'BOUGHT'), owned);
  let shown = '';
  return {
    el,
    hasAffordable: (r) => availableInsurerUpgrades(r).some((u) => u.cost <= r.cash),
    render(r) {
      const items = availableInsurerUpgrades(r);
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
        owned.replaceChildren(...INSURER_UPGRADES.filter((u) => r.upgrades.includes(u.id)).map((u) => h('li', {}, u.name)));
      }
      for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = r.cash < Number(b.dataset.cost);
    },
  };
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
