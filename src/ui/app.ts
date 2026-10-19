import { formatClock, formatNumber } from '../core/format';
import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { oreRate, refineryCapacity } from '../mission/economy';
import { depth } from '../mission/progress';
import { h, setText } from './dom';
import { createLogView } from './log';
import { createSystemsPanel } from './systems';
import { createUpgradesPanel, hasUpgradesToShow } from './upgrades';
import { createCrewPanel } from './crew';
import { createDirectivesPanel, hasDirectivesToShow } from './directives';
import { isCrewUnlocked } from '../mission/crew';
import { advanceFrame, paintAll, paintSprite, readPalette, spriteCanvas } from './sprites';

interface Panel {
  id: string;
  label: string;
  /** Phone tab bars are narrow. */
  short: string;
  el: HTMLElement;
  render(game: GameState): void;
  visible(game: GameState): boolean;
}

function stat(label: string, ariaLabel: string) {
  const value = h('dd', { class: 'stat-value', 'aria-label': ariaLabel }, '0');
  return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
}

export function mountApp(root: HTMLElement, store: Store): void {
  const shipName = h('span', { class: 'mast-ship' });
  const clock = h('span', { class: 'mast-clock' });
  const masthead = h(
    'header',
    { class: 'masthead' },
    h('div', { class: 'mast-brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'K/A'), 'KESSLER-AMARI COMBINE'),
    h('div', { class: 'mast-line' }, h('span', { class: 'mast-ship-wrap' }, spriteCanvas('ship', 'mast-sprite'), shipName), clock),
  );

  const ore = stat('ORE', 'Ore');
  const rate = stat('ORE/S', 'Ore per second');
  const credits = stat('CREDITS', 'Credits');
  const refinery = stat('REFINE/S', 'Refinery throughput');
  const shaft = stat('DEPTH', 'Shaft depth');
  const status = h(
    'section',
    { class: 'status', 'aria-label': 'Ship status' },
    h('div', { class: 'status-target' }, spriteCanvas('moonlet', 'status-moon'), h('span', { class: 'status-target-name' })),
    h('dl', { class: 'stats' }, ore.el, credits.el, rate.el, refinery.el, shaft.el),
  );
  const targetName = status.querySelector('.status-target-name')!;

  const log = createLogView();
  const drillBit = spriteCanvas('drill', 'drill-sprite');
  const drill = h('button', { class: 'drill', type: 'button' }, drillBit, h('span', { class: 'drill-label' }, 'EXECUTE DRILL CYCLE'));
  drill.setAttribute('aria-label', 'Execute drill cycle');
  const drillOnce = () => {
    store.dispatch({ type: 'drill' });
    spawnTick(drill);
    advanceFrame(drillBit);
    paintSprite(drillBit, palette);
  };
  // pointerdown fires immediately on touch (no click delay) so rapid tapping on phones feels right.
  drill.addEventListener('pointerdown', (e) => {
    if (e.button === 0) drillOnce();
  });
  // Keyboard activation produces a click with detail 0; pointer clicks were already handled above.
  drill.addEventListener('click', (e) => {
    if (e.detail === 0) drillOnce();
  });
  // Outside the panels so it stays reachable on phones whichever tab is open.
  const drillBay = h('div', { class: 'drill-bay' }, drill);

  const systems = createSystemsPanel(store);
  const upgrades = createUpgradesPanel(store);
  const crew = createCrewPanel(store);
  const directives = createDirectivesPanel();
  const panels: Panel[] = [
    {
      id: 'ops',
      label: 'OPS',
      short: 'OPS',
      el: h('section', { class: 'panel panel-ops', role: 'tabpanel', id: 'panel-ops', 'aria-labelledby': 'tab-ops' }, log.el),
      render: (g) => log.render(g.mission.log),
      visible: () => true,
    },
    { id: 'systems', label: 'SYSTEMS', short: 'SYS', el: systems.el, render: (g) => systems.render(g.mission), visible: () => true },
    {
      id: 'upgrades',
      label: 'UPGRADES',
      short: 'UPG',
      el: upgrades.el,
      render: (g) => upgrades.render(g.mission),
      visible: (g) => hasUpgradesToShow(g.mission),
    },
    { id: 'crew', label: 'CREW', short: 'CREW', el: crew.el, render: (g) => crew.render(g.mission), visible: (g) => isCrewUnlocked(g.mission) },
    {
      id: 'directives',
      label: 'DIRECTIVES',
      short: 'DIR',
      el: directives.el,
      render: (g) => directives.render(g.mission),
      visible: (g) => hasDirectivesToShow(g.mission),
    },
  ];

  const tabs = panels.map((p) => {
    const b = h(
      'button',
      { class: `tab tab-${p.id}`, role: 'tab', id: `tab-${p.id}`, 'aria-controls': `panel-${p.id}`, 'aria-label': p.label, type: 'button' },
      h('span', { class: 'tab-full' }, p.label),
      h('span', { class: 'tab-short' }, p.short),
    );
    b.addEventListener('click', () => selectTab(p.id));
    return b;
  });
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Panels' }, ...tabs);

  let current = 'ops';
  function selectTab(id: string) {
    current = id;
    root.dataset.tab = id;
    // On desktop the ops column is always visible, so the side column shows systems while "ops" is selected.
    const side = id === 'ops' ? 'systems' : id;
    panels.forEach((p, i) => {
      p.el.classList.toggle('is-active', p.id === id);
      p.el.classList.toggle('is-side', p.id === side);
      tabs[i]!.classList.toggle('is-side', p.id === side);
      tabs[i]!.setAttribute('aria-selected', String(p.id === id));
    });
  }

  root.classList.add('shell');
  root.replaceChildren(masthead, status, ...panels.map((p) => p.el), drillBay, tabbar);
  selectTab('ops');
  const palette = readPalette(root);
  paintAll(root);

  function render(game: GameState) {
    const m = game.mission;
    setText(shipName, m.config.shipName.toUpperCase());
    setText(targetName, m.config.targetBody.toUpperCase());
    setText(clock, `T+${formatClock(m.elapsed)}`);
    setText(ore.value, formatNumber(m.ore));
    setText(credits.value, formatNumber(m.credits));
    setText(rate.value, formatNumber(oreRate(m)));
    setText(refinery.value, formatNumber(refineryCapacity(m)));
    setText(shaft.value, `${depth(m).toLocaleString('en-US')} M`);
    if (root.dataset.act !== String(m.act)) root.dataset.act = String(m.act);
    panels.forEach((p, i) => {
      const visible = p.visible(game);
      tabs[i]!.hidden = !visible;
      if (!visible && current === p.id) selectTab('ops');
      if (visible) p.render(game);
    });
  }

  store.subscribe(render);
  render(store.getState());
}

function spawnTick(anchor: HTMLElement) {
  const tick = h('span', { class: 'drill-tick', 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 60 - 30)}px` }, '+1');
  anchor.append(tick);
  setTimeout(() => tick.remove(), 700);
}
