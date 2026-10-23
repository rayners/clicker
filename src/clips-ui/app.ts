import { formatNumber } from '../engine/format';
import { createGuideProgress } from '../engine/guide';
import { createActionButton } from '../engine/ui/action';
import { createBuyList, type Currency } from '../engine/ui/buy-list';
import { h, setText } from '../engine/ui/dom';
import { createEndingChooser } from '../engine/ui/endings';
import { createFlow } from '../engine/ui/flow';
import { createGuideView } from '../engine/ui/guide';
import { createLogView } from '../engine/ui/log';
import { createMonitor } from '../engine/ui/monitor';
import { createSettings } from '../engine/ui/settings';
import { createShell } from '../engine/ui/shell';
import { createShop } from '../engine/ui/shop';
import { createStepper } from '../engine/ui/stepper';
import { createTabs } from '../engine/ui/tabs';
import { GUIDE_RULES, GUIDE_STEPS, UPGRADES, type NoteKind } from '../clips/content';
import { clipsSaves, type ClipsGame, type ClipsStore, type Ending } from '../clips/game';
import { autoclipperCost, availableUpgrades, clipperRate, demand, marketingCost, type Works } from '../clips/works';

const DOLLARS: Currency = { text: (n) => `$${formatNumber(n)}`, spoken: (n) => `$${formatNumber(n)}` };
const cents = (n: number) => `$${n.toFixed(2)}`;
const clock = (t: number) => `${String(Math.floor(t / 60)).padStart(3, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const ENDINGS: Record<Ending, { title: string; text: string }> = {
  sell: { title: 'SELL THE WORKS', text: 'A firm from the capital buys the bench, the dies and the name. You start again across town, and people remember you.' },
  cooperative: { title: 'HAND IT TO THE WORKERS', text: 'The people who bent the clips own the works now. You start again across town, and people remember that too.' },
};

/** The guide's progress is a per-device convenience, kept apart from the save. */
const GUIDE_KEY = 'clips.guide';

/** CLIP WORKS on screen, built only from the engine's parts. */
export function mountClips(root: HTMLElement, store: ClipsStore): void {
  const settings = createSettings<ClipsGame>({
    store,
    saves: clipsSaves,
    settings: (g) => g.profile.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'CLOSE THE WORKS', aria: 'Close the works and start again', onConfirm: () => store.dispatch({ type: 'reset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() }) },
    sound: false,
    downloadName: (date) => `clip-works-${date}.txt`,
  });
  const guide = createGuideView<Works>({ steps: () => GUIDE_STEPS, rules: () => GUIDE_RULES, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const masthead = h('header', { class: 'mast' }, h('h1', { class: 'mast-name' }, 'CLIP WORKS'), guide.rulesButton, settings.button);

  const flow = createFlow<Works>({
    cells: [
      { label: 'WIRE', aria: 'Wire', unit: 'IN' },
      { label: 'CLIPS', aria: 'Unsold clips', unit: 'ON HAND' },
      { label: 'SALES', aria: 'Sales', unit: '$/S' },
    ],
    meterLabel: 'Demand met',
    rateUnit: '$/S',
    identity: (w) => String(w.seed),
    read: (w) => {
      const making = w.autoclippers * clipperRate(w);
      // Selling only what is on hand or coming off the bench.
      const selling = w.unsold >= 1 ? demand(w) : Math.min(demand(w), making);
      const income = selling * w.price;
      const base = { values: [Math.floor(w.wire), Math.floor(w.unsold), income] as [number, number, number], meter: Math.min(100, (making / demand(w)) * 100), rate: income };
      if (w.wire < 1) return { ...base, limit: 'wire', highlight: 0, severe: true, note: 'OUT OF WIRE · BUY A SPOOL' };
      if (w.unsold > demand(w) * 30) return { ...base, limit: 'demand', highlight: 1, severe: false, note: 'CLIPS PILING UP · LOWER THE PRICE OR BUY MARKETING' };
      if (making === 0) return { ...base, limit: 'hands', highlight: 1, severe: false, note: 'MADE BY HAND · BUY AN AUTOCLIPPER' };
      return { ...base, limit: 'sales', highlight: 2, severe: false, note: 'THE WORKS HUMS' };
    },
  });
  const price = createStepper({
    value: { aria: 'Price per clip' },
    less: { label: 'Lower the price', onPress: () => store.dispatch({ type: 'shiftPrice', step: -1 }) },
    more: { label: 'Raise the price', onPress: () => store.dispatch({ type: 'shiftPrice', step: 1 }) },
  });
  const funds = h('dd', { class: 'stat-value', 'aria-label': 'Funds' });
  const made = h('dd', { class: 'stat-value', 'aria-label': 'Clips made' });
  const status = h(
    'section',
    { class: 'status', 'aria-label': 'The works' },
    flow.el,
    h('div', { class: 'price' }, h('span', { class: 'price-name' }, 'PRICE'), price.el),
    h('dl', { class: 'stats' }, h('div', { class: 'stat' }, h('dt', {}, 'FUNDS'), funds), h('div', { class: 'stat' }, h('dt', {}, 'MADE'), made)),
  );

  const log = createLogView<NoteKind>({ label: 'Works log', stamp: clock });
  const monitor = createMonitor<Works>(
    [
    { id: 'clippers', label: 'AUTOCLIPPERS', period: 1, running: (w) => w.autoclippers > 0 && w.wire >= 1, count: (w) => `×${w.autoclippers}`, output: (w) => `${formatNumber(w.autoclippers * clipperRate(w))} CLIPS/S` },
    ],
    { idle: 'NO AUTOCLIPPERS ON THE BENCH YET' },
  );
  const bench = createBuyList<Works>({
    funds: (w) => w.funds,
    currency: DOLLARS,
    items: [
      { id: 'wire', name: 'WIRE', description: 'A spool from the merchant. The price moves every few seconds.', ariaName: 'a spool of wire', owned: (w) => `${formatNumber(w.wire)} IN`, price: (w) => w.wireCost, onBuy: () => store.dispatch({ type: 'buyWire' }) },
      {
        id: 'autoclipper',
        name: 'AUTOCLIPPER',
        description: 'Bends a clip a second while there is wire on the bench.',
        owned: (w) => String(w.autoclippers),
        notes: [{ read: (w) => `${formatNumber(clipperRate(w))} CLIPS/S EA` }],
        price: autoclipperCost,
        onBuy: () => store.dispatch({ type: 'buyAutoclipper' }),
      },
      {
        id: 'marketing',
        name: 'MARKETING',
        description: 'Posters, then papers, then the radio. More people want clips at any price.',
        owned: (w) => `LV ${w.marketing}`,
        notes: [{ read: (w) => `${formatNumber(demand(w))} CLIPS/S WANTED` }],
        price: marketingCost,
        onBuy: () => store.dispatch({ type: 'buyMarketing' }),
      },
    ],
  });
  const shop = createShop<Works, (typeof UPGRADES)[number]>({
    title: 'UPGRADES',
    all: UPGRADES,
    available: availableUpgrades,
    owned: (w) => w.upgrades,
    funds: (w) => w.funds,
    currency: DOLLARS,
    onBuy: (id) => store.dispatch({ type: 'buyUpgrade', id }),
  });
  const endings = createEndingChooser<ClipsGame, Ending>({
    endings: ['sell', 'cooperative'],
    available: () => ['sell', 'cooperative'],
    words: (g, e) => ({ ...ENDINGS[e], reward: `+1 GOOD WILL · ${g.profile.goodwill + 1} IN ALL` }),
    confirm: 'START AGAIN',
    onChoose: (ending) => store.dispatch({ type: 'complete', ending, seed: (Math.random() * 2 ** 31) | 0 }),
    className: 'end',
  });

  const tabs = createTabs<ClipsGame>({
    label: 'The works',
    home: 'log',
    side: 'works',
    root,
    panels: [
      { id: 'log', label: 'LOG', content: [monitor.el, log.el], render: (g) => (monitor.render(g.works), void log.render(g.works.log, `${g.profile.goodwill}`)) },
      { id: 'works', label: 'WORKS', content: [h('h2', { class: 'panel-title' }, 'THE BENCH'), bench.el], render: (g) => bench.render(g.works) },
      { id: 'upgrades', label: 'UPGRADES', content: [shop.el], render: (g) => shop.render(g.works), visible: (g) => shop.hasAny(g.works), attention: (g) => shop.hasAffordable(g.works) },
      { id: 'end', label: 'THE MILLION', content: [h('h2', { class: 'panel-title' }, 'ONE MILLION CLIPS'), endings.el], render: endings.render, visible: (g) => g.works.flags.includes('terminus'), attention: () => 'alert' },
    ],
  });
  const make = createActionButton({
    className: 'make',
    label: 'Make a paperclip',
    onPress: () => {
      if (store.getState().works.wire < 1) return;
      store.dispatch({ type: 'makeClip' });
      return '+1';
    },
  });

  createShell(root, {
    className: 'clips-shell',
    parts: [masthead, status, ...tabs.sections, h('div', { class: 'make-bay' }, guide.el, make.el), tabs.tabbar],
    overlays: [settings.dialog, guide.rulesDialog],
  });

  function render(game: ClipsGame) {
    const w = game.works;
    flow.render(w);
    price.render(cents(w.price), { less: w.price > 0.01 });
    setText(funds, `$${formatNumber(w.funds)}`);
    setText(made, formatNumber(w.made));
    root.dataset.act = String(w.act);
    root.dataset.motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    settings.render(game);
    tabs.render(game);
    guide.render(w);
  }

  store.subscribe(render);
  render(store.getState());
}
