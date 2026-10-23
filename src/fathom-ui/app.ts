import { formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { createFlow } from '../engine/ui/flow';
import { createTabs, type TabPanel } from '../engine/ui/tabs';
import { createActionButton } from '../engine/ui/action';
import { createShell } from '../engine/ui/shell';
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
  const zone = (id: string, label: string, c: Component, visible?: (o: Outfit) => boolean): TabPanel<FathomGame> => ({
    id,
    label,
    content: [c.el],
    render: (g) => c.render(g.outfit),
    visible: visible && ((g) => visible(g.outfit)),
  });
  // On desktop the log is always shown; the side column shows the chosen zone (the beach by default).
  const tabs = createTabs<FathomGame>({
    label: 'Zones',
    idPrefix: 'fa-',
    home: 'log',
    side: 'beach',
    root,
    panels: [
      { id: 'log', label: 'LOG', content: [log.el], render: (g) => void log.render(g.outfit.log, `${g.outfit.terms.season}:${g.outfit.seed}`) },
      zone('beach', 'BEACH', beach),
      zone('shelf', 'SHELF', shelf, isShelfOpen),
      zone('station', 'STATION', station, isOpenWaterOpen),
      zone('trench', 'TRENCH', trench, isTrenchOpen),
      zone('coast', 'COAST', coast, isBreachOpen),
      { id: 'store', label: 'STORE', content: [shop.el], render: (g) => shop.render(g.outfit), attention: (g) => shop.hasAffordable(g.outfit) },
      { id: 'end', label: "SEASON'S END", content: [end.el], render: (g) => end.render(g), visible: (g) => g.outfit.flags.includes('terminus'), attention: () => true },
    ],
  });

  const pass = createActionButton({
    className: 'pass',
    label: 'Sell a beach pass',
    onPress: () => {
      const price = passPrice(store.getState().outfit);
      soldByHand = true;
      store.dispatch({ type: 'sellPass' });
      return `+$${formatNumber(price)}`;
    },
  });

  const shell = createShell(root, {
    className: 'sonar-shell',
    parts: [banner, status, ...tabs.sections, h('div', { class: 'pass-bay' }, guide.el, pass.el), tabs.tabbar],
    overlays: [deepView.el, config.dialog, seam.dialog, guide.rulesDialog],
  });

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
    shell.cover(game.mode !== 'season');
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
    tabs.render(game);
  }

  store.subscribe(render);
  render(store.getState());
}
