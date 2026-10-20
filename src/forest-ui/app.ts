import { formatNumber } from '../shared/format';
import { h, setText } from '../shared/ui/dom';
import { createFlow } from '../shared/ui/flow';
import { createLogView } from '../shared/ui/log';
import { createSpriteKit } from '../shared/ui/sprites';
import { CLASS_IDS } from '../forest-data/classes';
import { FOREST_SPRITES } from '../forest-data/sprites';
import { appraisalRate, available, delve, gatherRate, netRate } from '../forest/company';
import { formatDay } from '../forest/calendar';
import type { Company, EntryKind } from '../forest/state';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { createBoard } from './board';
import { createExpeditions } from './expeditions';
import { createHall } from './hall';
import { createRoster } from './roster';
import { createMapStrip } from './map';
import { createConfig } from './config';
import { availableUpgrades } from '../forest/company';

const PER_MINUTE = 60;
const BLIGHT_WARNING = 50;
const TREE_COPIES = 12;

const kit = createSpriteKit({
  sprites: FOREST_SPRITES,
  paletteVars: { a: '--faint', b: '--ink-dim', c: '--ink', d: '--gilt', e: '--rubric' },
  fallback: '#e8dcc0',
});

interface Panel {
  id: string;
  label: string;
  el: HTMLElement;
  render(c: Company): void;
  /** Lights the tab when something there wants attention. */
  attention?(c: Company): boolean;
}

function stat(label: string, aria: string) {
  const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
  return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
}

export function mountForest(root: HTMLElement, store: ForestStore): void {
  const config = createConfig(store);
  const dayStamp = h('span', { class: 'mast-day' });
  const masthead = h(
    'header',
    { class: 'masthead' },
    h('div', { class: 'mast-brand' }, h('span', { class: 'brand-name' }, 'The Company of the Ashen Key')),
    h('div', { class: 'mast-line' }, h('span', { class: 'mast-place' }, 'LEDGER · THISTLEGATE'), h('span', { class: 'mast-right' }, dayStamp, config.button)),
    // Repeated at native pixel scale (alternate copies mirrored) rather than stretched.
    h('div', { class: 'mast-trees', 'aria-hidden': 'true' }, ...Array.from({ length: TREE_COPIES }, () => kit.spriteCanvas('treeline', 'mast-tree'))),
  );

  const flow = createFlow<Company>({
    cells: [
      { label: 'GATHER', aria: 'Relics gathered per minute', unit: 'RELICS/MIN' },
      { label: 'APPRAISE', aria: 'Appraisal per minute', unit: 'RELICS/MIN' },
      { label: 'COFFERS', aria: 'Net thalers per minute', unit: '₮/MIN' },
    ],
    meterLabel: 'Blight',
    rateUnit: 'RELICS/MIN',
    identity: (c) => String(c.seed),
    read: (c) => {
      const gather = gatherRate(c) * PER_MINUTE;
      const appraise = appraisalRate(c) * PER_MINUTE;
      const net = netRate(c) * PER_MINUTE;
      const blight = c.blight >= BLIGHT_WARNING ? ` · BLIGHT ${Math.round(c.blight)}%: THE HANDS DREAM OF ROOTS` : '';
      const base = { values: [gather, appraise, net] as [number, number, number], meter: c.blight, rate: gather };
      if (net < 0) return { ...base, limit: 'wages', highlight: 2, severe: true, note: `WAGES OUTRUN INCOME · SEND PARTIES OR LET HANDS GO${blight}` };
      if (gather > appraise) return { ...base, limit: 'appraisal', highlight: 1, severe: true, note: `APPRAISERS BEHIND · RELICS PILE UP IN THE VAULT${blight}` };
      return { ...base, limit: 'gathering', highlight: 0, severe: false, note: (gather === 0 ? 'NO PARTIES IN THE WOOD · FORAGE OR SEND ONE' : 'APPRAISERS IDLE · SEND MORE PARTIES') + blight };
    },
  });

  const silver = stat('THALERS', 'Thalers');
  const vault = stat('VAULT', 'Vault relics');
  const ready = stat('READY', 'Hands ready');
  const depth = stat('DELVE', 'Delve');
  // select() is declared below; the strip only calls it on a tap.
  const map = createMapStrip(() => select('expeditions'));
  const standing = h(
    'section',
    { class: 'status', 'aria-label': 'Company standing' },
    map.el,
    flow.el,
    h('dl', { class: 'stats' }, silver.el, vault.el, ready.el, depth.el),
  );

  const log = createLogView<EntryKind>({ label: 'Company ledger', stamp: formatDay });
  const board = createBoard();
  const expeditions = createExpeditions(store);
  const rosterPanel = createRoster(store);
  const hall = createHall(store);
  const section = (id: string, ...children: HTMLElement[]) =>
    h('section', { class: `panel panel-${id}`, role: 'tabpanel', id: `panel-${id}`, 'aria-labelledby': `tab-${id}` }, ...children);
  const panels: Panel[] = [
    {
      id: 'ledger',
      label: 'LEDGER',
      el: section('ledger', board.el, log.el),
      render: (c) => {
        board.render(c);
        log.render(c.log, String(c.seed));
      },
    },
    { id: 'expeditions', label: 'EXPEDITIONS', el: section('expeditions', expeditions.el), render: (c) => expeditions.render(c) },
    { id: 'roster', label: 'ROSTER', el: section('roster', rosterPanel.el), render: (c) => rosterPanel.render(c) },
    {
      id: 'hall',
      label: 'HALL',
      el: section('hall', hall.el),
      render: (c) => hall.render(c),
      attention: (c) => availableUpgrades(c).some((u) => u.cost <= c.silver),
    },
  ];

  const tabs = panels.map((p) => {
    const b = h('button', { class: `tab tab-${p.id}`, role: 'tab', id: `tab-${p.id}`, 'aria-controls': `panel-${p.id}`, type: 'button' }, p.label);
    b.addEventListener('click', () => select(p.id));
    return b;
  });
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Ledger sections' }, ...tabs);

  function select(id: string) {
    root.dataset.tab = id;
    // On desktop the ledger is always shown; the side column shows the chosen section (expeditions by default).
    const side = id === 'ledger' ? 'expeditions' : id;
    panels.forEach((p, i) => {
      p.el.classList.toggle('is-active', p.id === id);
      p.el.classList.toggle('is-side', p.id === side);
      tabs[i]!.classList.toggle('is-side', p.id === side);
      tabs[i]!.setAttribute('aria-selected', String(p.id === id));
    });
  }

  const keyBit = kit.spriteCanvas('key', 'forage-sprite');
  const forage = h('button', { class: 'forage', type: 'button', 'aria-label': 'Forage the eaves' }, keyBit, h('span', { class: 'forage-label' }, 'FORAGE THE EAVES'));
  const forageOnce = () => {
    store.dispatch({ type: 'forage' });
    kit.advanceFrame(keyBit);
    kit.paintSprite(keyBit, palette);
    const tick = h('span', { class: 'forage-tick', 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 60 - 30)}px` }, '+1');
    forage.append(tick);
    setTimeout(() => tick.remove(), 700);
  };
  forage.addEventListener('pointerdown', (e) => {
    if (e.button === 0) forageOnce();
  });
  forage.addEventListener('click', (e) => {
    if (e.detail === 0) forageOnce();
  });

  root.classList.add('ledger-shell');
  root.replaceChildren(masthead, standing, ...panels.map((p) => p.el), h('div', { class: 'forage-bay' }, forage), tabbar, config.dialog);
  select('ledger');
  const palette = kit.readPalette(root);
  kit.paintAll(root);

  function render(game: ForestGame) {
    const c = game.company;
    setText(dayStamp, formatDay(c.elapsed));
    flow.render(c);
    setText(silver.value, formatNumber(c.silver));
    setText(vault.value, formatNumber(c.relics));
    setText(ready.value, String(CLASS_IDS.reduce((s, id) => s + available(c, id), 0)));
    setText(depth.value, `${delve(c).toFixed(1)} LEAGUES`);
    map.render(c);
    root.dataset.motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    config.render(game);
    panels.forEach((p, i) => {
      const lit = p.attention?.(c) ?? false;
      if ((tabs[i]!.dataset.attention === 'active') !== lit) {
        if (lit) tabs[i]!.dataset.attention = 'active';
        else delete tabs[i]!.dataset.attention;
      }
    });
    for (const p of panels) {
      try {
        p.render(c);
      } catch (error) {
        console.error(`panel ${p.id} failed to render`, error);
      }
    }
  }

  store.subscribe(render);
  render(store.getState());
}
