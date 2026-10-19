import { formatClock, formatNumber } from '../core/format';
import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { autoDrillOutput, autoDrillRate, clickPower } from '../mission/extraction/economy';
import { depth } from '../mission/extraction/progress';
import { h, setText } from './dom';
import { createLogView } from './log';
import { createFlow } from './flow';
import { createMonitor } from './monitor';
import { createSystemsPanel } from './systems';
import { createUpgradesPanel, hasUpgradesToShow } from './upgrades';
import { createCrewPanel } from './crew';
import { createDirectivesPanel, hasDirectivesToShow } from './directives';
import { createProjectsPanel } from './projects';
import { createArchivePanel, hasArchiveToShow } from './archive';
import { createTerminusPanel } from './terminus';
import { createSettings } from './settings';
import { createSound, cueForLog } from './sound';
import { isSpecialProjectsUnlocked } from '../mission/organism/containment';
import { isCrewUnlocked } from '../mission/crew';
import { advanceFrame, paintAll, paintSprite, readPalette, spriteCanvas } from './sprites';

const SPRITE_CORRUPTION: Record<number, number> = { 1: 0, 2: 0, 3: 0.15, 4: 0.45 };
const GLITCH_INTERVAL = 1.5;
const TRACKER_PING_INTERVAL = 2.5;
/** Visible autocycle presses are capped so high rates don't flood the drill with ticks. */
const MAX_AUTO_TICKS_PER_SECOND = 4;

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
  const sound = createSound();
  const settings = createSettings(store);
  // iOS only allows audio to start inside a user gesture.
  root.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  const shipName = h('span', { class: 'mast-ship' });
  const clock = h('span', { class: 'mast-clock' });
  const masthead = h(
    'header',
    { class: 'masthead' },
    h(
      'div',
      { class: 'mast-brand' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'K/A'),
      h('span', { class: 'brand-name' }, 'KESSLER-AMARI COMBINE'),
      settings.button,
    ),
    h('div', { class: 'mast-line' }, h('span', { class: 'mast-ship-wrap' }, spriteCanvas('ship', 'mast-sprite'), shipName), clock),
  );

  const ore = stat('ORE', 'Ore');
  const credits = stat('CREDITS', 'Credits');
  const shaft = stat('DEPTH', 'Shaft depth');
  const contacts = stat('CONTACTS', 'Unknown contacts');
  contacts.el.classList.add('stat-alert');
  ore.el.querySelector('.stat-label')!.textContent = 'ORE HOPPER';
  const flow = createFlow();
  const status = h(
    'section',
    { class: 'status', 'aria-label': 'Ship status' },
    h('div', { class: 'status-target' }, spriteCanvas('moonlet', 'status-moon'), h('span', { class: 'status-target-name' })),
    flow.el,
    h('dl', { class: 'stats' }, ore.el, credits.el, shaft.el, contacts.el),
  );
  const targetName = status.querySelector('.status-target-name')!;

  const log = createLogView();
  const drillBit = spriteCanvas('drill', 'drill-sprite');
  const drill = h('button', { class: 'drill', type: 'button' }, drillBit, h('span', { class: 'drill-label' }, 'EXECUTE DRILL CYCLE'));
  drill.setAttribute('aria-label', 'Execute drill cycle');
  const drillOnce = () => {
    const power = clickPower(store.getState().mission);
    store.dispatch({ type: 'drill' });
    sound.play('click');
    spawnTick(drill, `+${formatNumber(power)}`);
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

  const monitor = createMonitor();
  const systems = createSystemsPanel(store);
  const upgrades = createUpgradesPanel(store);
  const crew = createCrewPanel(store);
  const directives = createDirectivesPanel();
  const projects = createProjectsPanel(store);
  const archive = createArchivePanel();
  const terminus = createTerminusPanel(store);
  const panels: Panel[] = [
    {
      id: 'ops',
      label: 'OPS',
      short: 'OPS',
      el: h('section', { class: 'panel panel-ops', role: 'tabpanel', id: 'panel-ops', 'aria-labelledby': 'tab-ops' }, monitor.el, log.el),
      render: (g) => {
        monitor.render(g.mission);
        const fresh = log.render(g.mission.log, `${g.mission.config.shipName}:${g.mission.seed}`);
        const last = fresh[fresh.length - 1];
        if (last) sound.play(cueForLog(last.kind));
      },
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
    {
      id: 'projects',
      label: 'SPECIAL PROJECTS',
      short: 'S.P.',
      el: projects.el,
      render: (g) => projects.render(g.mission),
      visible: (g) => isSpecialProjectsUnlocked(g.mission),
    },
    {
      id: 'archive',
      label: 'ARCHIVE',
      short: 'ARC',
      el: archive.el,
      render: (g) => archive.render(g),
      visible: hasArchiveToShow,
    },
    {
      id: 'terminus',
      label: 'TERMINUS',
      short: 'END',
      el: terminus.el,
      render: (g) => terminus.render(g),
      visible: (g) => g.mission.flags.includes('terminus'),
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
  root.replaceChildren(masthead, status, ...panels.map((p) => p.el), drillBay, tabbar, settings.dialog);
  selectTab('ops');
  let palette = readPalette(root);
  paintAll(root);
  let paintedAct = 0;
  let lastGlitch = -Infinity;
  let lastPing = -Infinity;
  let lastElapsed: number | null = null;
  let autoClock = 0;

  function render(game: GameState) {
    const m = game.mission;
    setText(shipName, m.config.shipName.toUpperCase());
    setText(targetName, m.config.targetBody.toUpperCase());
    setText(clock, `T+${formatClock(m.elapsed)}`);
    setText(ore.value, formatNumber(m.ore));
    setText(credits.value, formatNumber(m.credits));
    flow.render(game);
    autoCycle(m);
    setText(shaft.value, `${depth(m).toLocaleString('en-US')} M`);
    if (root.dataset.act !== String(m.act)) root.dataset.act = String(m.act);
    const motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    if (root.dataset.motion !== motion) root.dataset.motion = motion;
    sound.setEnabled(game.profile.settings.sound);
    settings.render(game);
    const tracking = m.flags.includes('tracker');
    contacts.el.hidden = !tracking;
    setText(contacts.value, String(m.contacts));
    const alert = String(m.contacts > 0);
    if (root.dataset.alert !== alert) root.dataset.alert = alert;
    repaintSprites(m.act, m.elapsed);
    if (m.contacts > 0 && m.elapsed - lastPing >= TRACKER_PING_INTERVAL) {
      lastPing = m.elapsed;
      sound.play('ping');
    }
    panels.forEach((p, i) => {
      const visible = p.visible(game);
      tabs[i]!.hidden = !visible;
      if (!visible && current === p.id) selectTab('ops');
      if (!visible) return;
      try {
        p.render(game);
      } catch (error) {
        // One broken panel must never freeze the whole game loop.
        console.error(`panel ${p.id} failed to render`, error);
      }
    });
  }

  /** WARDEN's autocycle visibly presses the drill on its own. */
  function autoCycle(m: GameState['mission']) {
    const cycles = autoDrillRate(m);
    const auto = cycles > 0 ? 'on' : 'off';
    if (drill.dataset.auto !== auto) drill.dataset.auto = auto;
    const dt = lastElapsed === null || m.elapsed < lastElapsed ? 0 : m.elapsed - lastElapsed;
    lastElapsed = m.elapsed;
    if (cycles === 0) return;
    const interval = 1 / Math.min(cycles, MAX_AUTO_TICKS_PER_SECOND);
    autoClock += dt;
    if (autoClock < interval) return;
    autoClock = Math.min(autoClock - interval, interval);
    const perPress = autoDrillOutput(m) * interval;
    spawnTick(drill, `+${formatNumber(perPress)}`, 'drill-tick is-auto');
    advanceFrame(drillBit);
    paintSprite(drillBit, palette);
  }

  /** Sprites re-tint when the act changes the palette, and glitch intermittently from act 3 on. */
  function repaintSprites(act: number, elapsed: number) {
    const corruption = SPRITE_CORRUPTION[act] ?? 0.5;
    if (act !== paintedAct) {
      paintedAct = act;
      palette = readPalette(root);
      paintAll(root);
    }
    if (corruption === 0 || elapsed - lastGlitch < GLITCH_INTERVAL) return;
    lastGlitch = elapsed;
    const glitching = Math.random() < (act >= 4 ? 0.6 : 0.25);
    paintAll(root, glitching ? corruption : 0, Math.floor(elapsed));
  }

  store.subscribe(render);
  render(store.getState());
}

function spawnTick(anchor: HTMLElement, text: string, cls = 'drill-tick') {
  const tick = h('span', { class: cls, 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 60 - 30)}px` }, text);
  anchor.append(tick);
  setTimeout(() => tick.remove(), 700);
}
