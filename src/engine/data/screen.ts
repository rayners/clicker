/**
 * A game made of data, on screen: the whole screen built from the definition, out of the engine's parts. A simple
 * game needs no layout of its own.
 * @module
 */
import { formatNumber } from '../format';
import { createGuideProgress, type GuideStep } from '../guide';
import type { Store } from '../store';
import { createActionButton } from '../ui/action';
import { createBuyList, type BuyItem, type Currency } from '../ui/buy-list';
import { h, setText } from '../ui/dom';
import { createEndingChooser } from '../ui/endings';
import { createFlow } from '../ui/flow';
import { createGuideView } from '../ui/guide';
import { createLogView } from '../ui/log';
import { createMonitor } from '../ui/monitor';
import { createSettings } from '../ui/settings';
import { createShell } from '../ui/shell';
import { createShop } from '../ui/shop';
import { createStepper } from '../ui/stepper';
import { createTabs } from '../ui/tabs';
import type { DataGame, DataRun } from './game';
import type { DataState, DataStateAction, createDataPlay } from './play';

const FONTS = { serif: "Georgia, 'Times New Roman', serif", sans: 'system-ui, sans-serif', mono: 'ui-monospace, Menlo, Consolas, monospace' };
const seed = () => (Math.random() * 2 ** 31) | 0;
const capital = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Builds the game's screen into `root` and keeps it in step with the store. */
export function mountDataGame(root: HTMLElement, game: DataGame, store: Store<DataState, DataStateAction>, play: ReturnType<typeof createDataPlay>): void {
  const def = game.definition;
  const market = def.mechanics?.market;
  const supply = def.mechanics?.supply;
  const items = def.items ?? [];
  const money = Object.entries(def.resources).find(([, r]) => r.format === 'money')?.[0];
  const show = (id: string, n: number) => (def.resources[id]?.format === 'money' ? `$${formatNumber(n)}` : formatNumber(Math.floor(n)));
  const currency = (resource: string): Currency =>
    def.resources[resource]?.format === 'money'
      ? { text: (n) => `$${formatNumber(n)}`, spoken: (n) => `$${formatNumber(n)}` }
      : { text: (n) => `${formatNumber(n)} ${def.resources[resource]?.label ?? resource}`, spoken: (n) => `${formatNumber(n)} ${(def.resources[resource]?.label ?? resource).toLowerCase()}` };

  // The look: the definition's colours as tokens the default theme reads.
  for (const [key, value] of Object.entries(def.theme ?? {})) root.style.setProperty(`--theme-${key}`, key === 'font' ? FONTS[value as keyof typeof FONTS] : String(value));

  const settings = createSettings<DataState>({
    store,
    saves: play.saves,
    settings: (s) => s.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'START OVER', aria: 'Start over from the beginning', onConfirm: () => store.dispatch({ type: 'reset', seed: seed(), now: Date.now() }) },
    sound: false,
    downloadName: (date) => `${def.id}-${date}.txt`,
  });

  const target = (t?: string) => (!t ? undefined : t === 'press' ? '.press' : t === 'market.price' ? '.price' : `[aria-label^="Buy ${items.find((i) => i.id === t)?.label ?? t}"]`);
  const steps: GuideStep<DataRun>[] = (def.guide ?? []).map((g, i) => {
    const showIf = g.show ? game.condition(g.show, `guide[${i}].show`) : null;
    const done = game.condition(g.done, `guide[${i}].done`);
    return { id: g.id, title: g.title, text: g.text, target: target(g.target), show: (r) => !showIf || game.holds(showIf, r), done: (r) => game.holds(done, r) };
  });
  const guide = createGuideView<DataRun>({ steps: () => steps, rules: () => ({ title: `HOW ${def.title} WORKS`, sections: def.rules ?? [] }), progress: createGuideProgress(window.localStorage, `data.${def.id}.guide`) });
  const masthead = h('header', { class: 'mast' }, h('h1', { class: 'mast-name' }, def.title), guide.rulesButton, settings.button);

  // The flow readout: what comes in, what is on hand to sell, and what it earns.
  const flow = market
    ? createFlow<DataRun>({
        cells: [
          { label: def.resources[supply?.buys ?? market.sells]?.label ?? '', aria: def.resources[supply?.buys ?? market.sells]?.label ?? '', unit: def.resources[supply?.buys ?? market.sells]?.unit ?? '' },
          { label: def.resources[market.sells]?.label ?? '', aria: def.resources[market.sells]?.label ?? '', unit: def.resources[market.sells]?.unit ?? 'ON HAND' },
          { label: 'SALES', aria: 'Sales', unit: '$/S' },
        ],
        meterLabel: 'Demand met',
        rateUnit: '$/S',
        identity: (r) => String(r.seed),
        read: (r) => {
          const making = items.reduce((sum, i) => sum + (r.owned[i.id] ?? 0) * game.stat(r, `${i.id}.rate`) * Math.max(0, i.converts?.[market.sells] ?? 0), 0);
          const want = game.demand(r);
          const selling = (r.amounts[market.sells] ?? 0) >= 1 ? want : Math.min(want, making);
          const income = selling * r.price;
          const base = { values: [Math.floor(r.amounts[supply?.buys ?? market.sells] ?? 0), Math.floor(r.amounts[market.sells] ?? 0), income] as [number, number, number], meter: Math.min(100, (making / Math.max(want, 1e-9)) * 100), rate: income };
          if (supply && (r.amounts[supply.buys] ?? 0) < 1) return { ...base, limit: 'supply', highlight: 0, severe: true, note: `OUT OF ${def.resources[supply.buys]?.label ?? supply.buys} · BUY MORE` };
          if ((r.amounts[market.sells] ?? 0) > want * 30) return { ...base, limit: 'demand', highlight: 1, severe: false, note: 'PILING UP · LOWER THE PRICE OR FIND MORE CUSTOMERS' };
          if (making === 0) return { ...base, limit: 'hands', highlight: 1, severe: false, note: 'MADE BY HAND · BUY SOMETHING TO MAKE IT FOR YOU' };
          return { ...base, limit: 'sales', highlight: 2, severe: false, note: 'ALL RUNNING' };
        },
      })
    : null;
  const price = market
    ? createStepper({
        value: { aria: 'Price' },
        less: { label: 'Lower the price', onPress: () => store.dispatch({ type: 'price', step: -1 }) },
        more: { label: 'Raise the price', onPress: () => store.dispatch({ type: 'price', step: 1 }) },
      })
    : null;
  const shownInFlow = new Set([market?.sells, supply?.buys].filter(Boolean));
  const stats = Object.entries(def.resources)
    .filter(([id]) => !shownInFlow.has(id))
    .map(([id, r]) => {
      const value = h('dd', { class: 'stat-value', 'aria-label': r.label });
      return { id, value, el: h('div', { class: 'stat' }, h('dt', {}, r.label), value) };
    });
  const status = h(
    'section',
    { class: 'status', 'aria-label': def.title },
    ...(flow ? [flow.el] : []),
    ...(price ? [h('div', { class: 'price' }, h('span', { class: 'price-name' }, 'PRICE'), price.el)] : []),
    h('dl', { class: 'stats' }, ...stats.map((s) => s.el)),
  );

  const producers = items.filter((i) => i.converts);
  const monitor = createMonitor<DataRun>(
    producers.map((i) => ({
      id: i.id,
      label: i.label,
      period: 1,
      running: (r) => (r.owned[i.id] ?? 0) > 0,
      count: (r) => `×${r.owned[i.id] ?? 0}`,
      output: (r) => `${formatNumber((r.owned[i.id] ?? 0) * game.stat(r, `${i.id}.rate`))}/S`,
    })),
    { idle: 'NOTHING RUNNING ON ITS OWN YET' },
  );
  const log = createLogView<string>({ label: `${def.title} log`, stamp: (t) => `${String(Math.floor(t / 60)).padStart(3, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}` });
  const buyItems: BuyItem<DataRun>[] = [
    ...(supply
      ? [
          {
            id: 'supply',
            name: def.resources[supply.buys]?.label ?? supply.buys,
            description: `A lot of ${formatNumber(supply.lot)}. The price moves every ${supply.price.every} seconds.`,
            owned: (r: DataRun) => show(supply.buys, r.amounts[supply.buys] ?? 0),
            price: (r: DataRun) => r.supplyPrice,
            onBuy: () => store.dispatch({ type: 'supply' }),
          },
        ]
      : []),
    ...items.map((i) => ({
      id: i.id,
      name: i.label,
      description: i.text,
      owned: (r: DataRun) => String(r.owned[i.id] ?? 0),
      notes: i.converts ? [{ read: (r: DataRun) => `${formatNumber(game.stat(r, `${i.id}.rate`))}/S EA` }] : [],
      price: (r: DataRun) => game.price(r, i.id),
      shown: (r: DataRun) => game.itemShown(r, i.id),
      onBuy: () => store.dispatch({ type: 'buy', id: i.id }),
    })),
  ];
  const buy = createBuyList<DataRun>({ funds: (r) => r.amounts[supply?.with ?? items[0]?.cost.resource ?? money ?? ''] ?? 0, currency: currency(supply?.with ?? items[0]?.cost.resource ?? money ?? ''), items: buyItems });
  const upgrades = def.upgrades ?? [];
  const shopResource = upgrades[0]?.cost.resource ?? money ?? '';
  const shop = createShop<DataRun, { id: string; name: string; description: string; cost: number }>({
    title: 'UPGRADES',
    all: upgrades.map((u) => ({ id: u.id, name: u.label, description: u.text, cost: u.cost.amount })),
    available: (r) => game.availableUpgrades(r).map((u) => ({ id: u.id, name: u.label, description: u.text, cost: u.cost.amount })),
    owned: (r) => r.upgrades,
    funds: (r) => r.amounts[shopResource] ?? 0,
    currency: currency(shopResource),
    onBuy: (id) => store.dispatch({ type: 'upgrade', id }),
  });
  const endings = createEndingChooser<DataState, string>({
    endings: (def.endings ?? []).map((e) => e.id),
    available: () => (def.endings ?? []).map((e) => e.id),
    words: (_s, id) => {
      const e = def.endings!.find((x) => x.id === id)!;
      const grants = Object.entries(e.grants ?? {}).map(([c, n]) => `+${n} ${def.carried?.[c]?.label ?? c}`).join(' · ');
      return { title: e.title, text: e.text, reward: grants };
    },
    confirm: 'START AGAIN',
    onChoose: (ending) => store.dispatch({ type: 'complete', ending, seed: seed() }),
    className: 'end',
  });

  const tabs = createTabs<DataState>({
    label: def.title,
    home: 'log',
    side: 'buy',
    root,
    panels: [
      { id: 'log', label: 'LOG', content: [monitor.el, log.el], render: (s) => (monitor.render(s.run), void log.render(s.run.log, String(s.run.seed))) },
      { id: 'buy', label: 'BUY', content: [h('h2', { class: 'panel-title' }, 'BUY'), buy.el], render: (s) => buy.render(s.run) },
      { id: 'upgrades', label: 'UPGRADES', content: [shop.el], render: (s) => shop.render(s.run), visible: (s) => shop.hasAny(s.run), attention: (s) => shop.hasAffordable(s.run) },
      { id: 'end', label: 'THE END', content: [h('h2', { class: 'panel-title' }, def.title), endings.el], render: endings.render, visible: (s) => s.run.flags.includes('terminus'), attention: () => 'alert' },
    ],
  });
  const press = createActionButton({
    className: 'press',
    label: capital(def.press.label),
    onPress: () => {
      const before = store.getState().run;
      store.dispatch({ type: 'press' });
      return store.getState().run === before ? undefined : '+1';
    },
  });

  createShell(root, {
    className: 'data-shell',
    parts: [masthead, status, ...tabs.sections, h('div', { class: 'press-bay' }, guide.el, press.el), tabs.tabbar],
    overlays: [settings.dialog, guide.rulesDialog],
  });

  function render(state: DataState) {
    const r = state.run;
    flow?.render(r);
    price?.render(`$${r.price.toFixed(2)}`, { less: market ? r.price > market.price.min : true });
    for (const s of stats) setText(s.value, show(s.id, r.amounts[s.id] ?? 0));
    root.dataset.act = String(r.act);
    root.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
    settings.render(state);
    tabs.render(state);
    guide.render(r);
  }

  store.subscribe(render);
  render(store.getState());
}
