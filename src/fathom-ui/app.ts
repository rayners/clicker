import { formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { createFlow } from '../engine/ui/flow';
import { createLogView } from '../engine/ui/log';
import { depth } from '../fathom/depth';
import { exposed, inWater, passPrice } from '../fathom/shallows';
import { blindShare, boats, isShelfOpen } from '../fathom/shelf';
import { isOpenWaterOpen, uncontained } from '../fathom/open-water';
import { hullRate, isTrenchOpen } from '../fathom/trench';
import { citiesHeld, isBreachOpen } from '../fathom/breach';
import { CITIES } from '../fathom-data/breach';
import type { FathomGame } from '../fathom/game';
import type { EntryKind, Outfit } from '../fathom/state';
import type { FathomStore } from '../fathom/store';
import { incomeNow } from '../fathom/income';
import { createBeach, createCoast, createShelf, createStation, createTrench, type Component } from './zones';
import { createConfig, createEndPanel, createSeam, createStorePanel } from './panels';
import { createDeepView } from './deep';
import { createGuideView } from '../engine/ui/guide';
import { createFathomSound, SONAR_EVERY, soundCues } from './sound';
import { createGuideProgress } from '../engine/guide';
import { fathomGuideRules, fathomGuideSteps } from '../fathom-data/guide';

/** The season clock: days of the season, as the log stamps them. */
export function seasonClock(seconds: number): string {
  const day = Math.floor(seconds / 600) + 1;
  const into = Math.floor(seconds % 600);
  return `DAY ${day} ${String(Math.floor(into / 25)).padStart(2, '0')}:00`;
}

interface Panel {
  id: string;
  label: string;
  el: HTMLElement;
  render(game: FathomGame): void;
  visible?(o: Outfit): boolean;
  attention?(o: Outfit): boolean;
}

function stat(label: string, aria: string) {
  const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
  return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
}

/** The guide's progress is a per-device convenience, kept apart from the save. */
const GUIDE_KEY = 'fathom.guide';

export function mountFathom(root: HTMLElement, store: FathomStore): void {
  const config = createConfig(store);
  const seam = createSeam(store);
  const deepView = createDeepView(store);
  const sound = createFathomSound();
  root.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  let soldByHand = false;
  let lastOutfit: Outfit | null = null;
  let lastSonar = 0;
  const guide = createGuideView<FathomGame>({ steps: fathomGuideSteps, rules: fathomGuideRules, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const depthValue = h('span', { class: 'mast-depth', 'aria-label': 'Depth' }, '0 M');
  const season = h('span', { class: 'mast-season', 'aria-label': 'Season' }, 'SEASON 1');
  const banner = h(
    'header',
    { class: 'mast' },
    h('div', { class: 'mast-line' }, h('span', { class: 'mast-name' }, 'HARROW POINT MARINE SAFETY'), guide.rulesButton, seam.button, config.button),
    h('div', { class: 'mast-line' }, season, depthValue),
    h('div', { class: 'sonar', 'aria-hidden': 'true' }, h('i', { class: 'sonar-sweep' })),
  );

  const flow = createFlow<Outfit>({
    cells: [
      { label: 'DEPTH', aria: 'Depth', unit: 'M' },
      { label: 'SWIMMERS', aria: 'In the water', unit: 'IN' },
      { label: 'INCOME', aria: 'Income', unit: '$/S' },
    ],
    meterLabel: 'Coast held',
    rateUnit: '$/S',
    identity: (o) => String(o.seed),
    read: (o) => {
      const income = incomeNow(o);
      const base = {
        values: [depth(o), Math.round(inWater(o)), income] as [number, number, number],
        meter: isBreachOpen(o) ? (citiesHeld(o) / CITIES.length) * 100 : 100,
        rate: income,
      };
      if (exposed(o) > 0) return { ...base, limit: 'beach', highlight: 1, severe: true, note: `${Math.ceil(exposed(o))} SWIMMERS UNWATCHED · HIRE GUARDS OR CLOSE SOME BEACH` };
      if (boats(o) > 0 && blindShare(o) > 0) return { ...base, limit: 'shelf', highlight: 2, severe: true, note: 'BOATS FISHING PAST THE SONAR · BUY BUOYS OR FISH CLOSER IN' };
      if (uncontained(o) > 0) return { ...base, limit: 'station', highlight: 2, severe: true, note: 'SPECIMENS THE PENS CANNOT HOLD · BUILD PENS OR EASE THE ENHANCEMENT' };
      if (hullRate(o) < 0) return { ...base, limit: 'trench', highlight: 0, severe: true, note: 'THE HULL IS FAILING · HIRE REPAIR CREWS OR RAISE THE STATION' };
      if (isBreachOpen(o) && citiesHeld(o) < CITIES.length) return { ...base, limit: 'coast', highlight: 2, severe: true, note: `${CITIES.length - citiesHeld(o)} CITIES FALLEN · BUILD WALLS AND BULWARKS` };
      if (inWater(o) === 0 && income === 0) return { ...base, limit: 'start', highlight: 1, severe: false, note: 'NOBODY ON THE BEACH · SELL PASSES OR BUY ATTRACTIONS' };
      return { ...base, limit: 'income', highlight: 2, severe: false, note: 'THE WATER IS QUIET · FOR NOW' };
    },
  });

  const cash = stat('CASH', 'Cash');
  const lost = stat('LOST', 'Lost to the water');
  const trust = stat('TOWN TRUST', 'Town trust');
  lost.el.classList.add('stat-lost');
  const status = h('section', { class: 'status', 'aria-label': 'Outfit status' }, flow.el, h('dl', { class: 'stats' }, cash.el, lost.el, trust.el));

  const log = createLogView<EntryKind>({ label: 'Sonar log', stamp: seasonClock });
  const beach = createBeach(store);
  const shelf = createShelf(store);
  const station = createStation(store);
  const trench = createTrench(store);
  const coast = createCoast(store);
  const shop = createStorePanel(store);
  const end = createEndPanel(store);
  const section = (id: string, label: string, child: HTMLElement) =>
    h('section', { class: `panel panel-${id}`, role: 'tabpanel', id: `fa-panel-${id}`, 'aria-labelledby': `fa-tab-${id}`, 'aria-label': label }, child);
  const zonePanel = (id: string, label: string, c: Component, visible?: (o: Outfit) => boolean): Panel => ({
    id,
    label,
    el: section(id, label, c.el),
    render: (g) => c.render(g.outfit),
    visible,
  });
  const panels: Panel[] = [
    { id: 'log', label: 'LOG', el: section('log', 'Log', log.el), render: (g) => void log.render(g.outfit.log, `${g.outfit.terms.season}:${g.outfit.seed}`) },
    zonePanel('beach', 'BEACH', beach),
    zonePanel('shelf', 'SHELF', shelf, isShelfOpen),
    zonePanel('station', 'STATION', station, isOpenWaterOpen),
    zonePanel('trench', 'TRENCH', trench, isTrenchOpen),
    zonePanel('coast', 'COAST', coast, isBreachOpen),
    { id: 'store', label: 'STORE', el: section('store', 'Store', shop.el), render: (g) => shop.render(g.outfit), attention: (o) => shop.hasAffordable(o) },
    {
      id: 'end',
      label: "SEASON'S END",
      el: section('end', "Season's end", end.el),
      render: (g) => end.render(g),
      visible: (o) => o.flags.includes('terminus'),
      attention: () => true,
    },
  ];
  const tabs = panels.map((p) => {
    const b = h('button', { class: 'tab', role: 'tab', id: `fa-tab-${p.id}`, 'aria-controls': `fa-panel-${p.id}`, type: 'button' }, p.label);
    b.addEventListener('click', () => select(p.id));
    return b;
  });
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Zones' }, ...tabs);

  function select(id: string) {
    root.dataset.tab = id;
    // On desktop the log is always shown; the side column shows the chosen zone (the beach by default).
    const side = id === 'log' ? 'beach' : id;
    panels.forEach((p, i) => {
      p.el.classList.toggle('is-active', p.id === id);
      p.el.classList.toggle('is-side', p.id === side);
      tabs[i]!.setAttribute('aria-selected', String(p.id === id));
    });
  }

  const pass = h('button', { class: 'pass', type: 'button', 'aria-label': 'Sell a beach pass' }, 'SELL A BEACH PASS');
  const sell = () => {
    const price = passPrice(store.getState().outfit);
    soldByHand = true;
    store.dispatch({ type: 'sellPass' });
    const tick = h('span', { class: 'pass-tick', 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 80 - 40)}px` }, `+$${formatNumber(price)}`);
    pass.append(tick);
    setTimeout(() => tick.remove(), 700);
  };
  pass.addEventListener('pointerdown', (e) => {
    if (e.button === 0) sell();
  });
  pass.addEventListener('click', (e) => {
    if (e.detail === 0) sell();
  });

  root.classList.add('sonar-shell');
  const shell = [banner, status, ...panels.map((p) => p.el), h('div', { class: 'pass-bay' }, guide.el, pass), tabbar];
  root.replaceChildren(...shell, deepView.el, config.dialog, seam.dialog, guide.rulesDialog);
  select('log');

  function render(game: FathomGame) {
    const o = game.outfit;
    setText(depthValue, `${formatNumber(depth(o))} M`);
    setText(season, `SEASON ${o.terms.season}`);
    flow.render(o);
    setText(cash.value, `$${formatNumber(o.cash)}`);
    setText(lost.value, formatNumber(o.bodyCount));
    setText(trust.value, `${Math.round(o.reputation * 100)}%`);
    root.dataset.act = String(o.act);
    root.dataset.motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    config.render(game);
    deepView.render(game);
    seam.render(game);
    // Behind the Source, the season is out of reach.
    for (const el of shell) el.toggleAttribute('inert', game.mode !== 'season');
    sound.setEnabled(game.profile.settings.sound);
    sound.setHum(game.mode === 'season' ? o.act : 0);
    if (lastOutfit && game.mode === 'season') for (const cue of soundCues(lastOutfit, o, soldByHand)) sound.play(cue);
    soldByHand = false;
    lastOutfit = o;
    // The sonar sweeps on a slow clock while the season runs.
    if (game.mode === 'season' && (o.elapsed - lastSonar >= SONAR_EVERY || o.elapsed < lastSonar)) {
      lastSonar = o.elapsed;
      sound.play('sonar');
    }
    guide.render(game);
    panels.forEach((p, i) => {
      const shown = p.visible?.(o) ?? true;
      tabs[i]!.hidden = !shown;
      if (shown && (p.attention?.(o) ?? false)) tabs[i]!.dataset.attention = 'active';
      else delete tabs[i]!.dataset.attention;
      if (!shown) {
        if (root.dataset.tab === p.id) select('log');
        return;
      }
      p.render(game);
    });
  }

  store.subscribe(render);
  render(store.getState());
}
