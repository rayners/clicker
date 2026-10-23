import { formatClock, formatNumber } from '../engine/format';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { guideRules, guideSteps } from '../data/guide';
import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { h, setText } from '../engine/ui/dom';
import { createLogView } from './log';
import { createFlow } from '../engine/ui/flow';
import { createTabs } from '../engine/ui/tabs';
import { createActionButton } from '../engine/ui/action';
import { createShell } from '../engine/ui/shell';
import { createMonitor } from '../engine/ui/monitor';
import { createExtractionUi } from './scenarios/extraction';
import { createTerraformUi } from './scenarios/terraform';
import { createSecurityUi } from './scenarios/security';
import { createSalvageUi } from './scenarios/salvage';
import { createHaulageUi } from './scenarios/haulage';
import { LAND_HAUL, SPACE_HAUL } from '../mission/haulage/profiles';
import { LAND_WORDS, SPACE_WORDS } from './haul-words';
import type { ScenarioUi, StatSpec } from './scenarios/types';
import { createCrewPanel } from './crew';
import { createDirectivesPanel, hasDirectivesToShow } from './directives';
import { createProjectsPanel } from './projects';
import { createSickBayPanel } from './sick-bay';
import { createArchivePanel, hasArchiveToShow } from './archive';
import { createTerminusPanel } from './terminus';
import { createSettings } from './settings';
import { createCreatureView } from './creature';
import { createHunterView } from './hunter';
import { createBoardroomView } from './boardroom';
import { createRestricted } from './restricted';
import { createAssignment } from './assignment';
import { createAlerts } from './alerts';
import { createSound, cueForLog, MAX_PRINTED_LINES, PRINT_SECONDS, PRINT_STAGGER } from './sound';
import { isSpecialProjectsUnlocked } from '../mission/organism/containment';
import { isOrganism, isOutbreak, type ScenarioId } from '../mission/state';
import { crewNeedingAttention, isCrewUnlocked } from '../mission/crew';
import { advanceFrame, paintAll, paintSprite, readPalette, setSprite, spriteCanvas } from './sprites';

const SPRITE_CORRUPTION: Record<number, number> = { 1: 0, 2: 0, 3: 0.15, 4: 0.45 };
const GLITCH_INTERVAL = 1.5;
const TRACKER_PING_INTERVAL = 2.5;
/** Visible autocycle presses are capped so high rates don't flood the drill with ticks. */
const MAX_AUTO_TICKS_PER_SECOND = 4;

function stat(label: string, ariaLabel: string) {
  const value = h('dd', { class: 'stat-value', 'aria-label': ariaLabel }, '0');
  return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
}

/** Everything on screen that belongs to one scenario; only the running scenario's view is shown. */
function scenarioView(ui: ScenarioUi) {
  const flow = createFlow(ui.flow);
  const monitor = createMonitor(ui.monitor, { idle: 'NO AUTOMATED SYSTEMS ONLINE · ACQUIRE IN SYSTEMS' });
  const stats = ui.stats.map((spec: StatSpec) => ({ spec, ...stat(spec.label, spec.aria) }));
  const status = h('div', { class: 'status-scenario' }, flow.el, ...(ui.controls ? [ui.controls.el] : []), h('dl', { class: 'stats' }, ...stats.map((s) => s.el)));
  return { ui, flow, monitor, stats, status };
}

const DEFAULT_SPRITES = { vessel: 'ship', target: 'moonlet', action: 'drill' };

/** The guide's progress is a per-device convenience, kept apart from the save. */
const GUIDE_KEY = 'deep-contract.guide';

/** The SICK BAY tab is marked once this share of the workforce is off sick. */
const SICK_ATTENTION = 0.1;

export function mountApp(root: HTMLElement, store: Store): void {
  const sound = createSound();
  const settings = createSettings(store);
  const creatureView = createCreatureView(store);
  const hunterView = createHunterView(store);
  const boardroomView = createBoardroomView(store);
  const restricted = createRestricted(store);
  const assignment = createAssignment(store);
  // iOS only allows audio to start inside a user gesture.
  root.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  const shipName = h('span', { class: 'mast-ship' });
  const vesselBit = spriteCanvas('ship', 'mast-sprite');
  const targetBit = spriteCanvas('moonlet', 'status-moon');
  const clock = h('span', { class: 'mast-clock' });
  // The walkthrough (docs/ROADMAP.md 6b): a tip above the big button, and the rules a tap away in the masthead.
  const guide = createGuideView<GameState>({ steps: guideSteps, rules: guideRules, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const masthead = h(
    'header',
    { class: 'masthead' },
    h(
      'div',
      { class: 'mast-brand' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'K/A'),
      h('span', { class: 'brand-name' }, 'KESSLER-AMARI COMBINE'),
      guide.rulesButton,
      restricted.button,
      settings.button,
    ),
    h('div', { class: 'mast-line' }, h('span', { class: 'mast-ship-wrap' }, vesselBit, shipName), clock),
  );

  const views: Record<ScenarioId, ReturnType<typeof scenarioView>> = {
    extraction: scenarioView(createExtractionUi(store)),
    terraform: scenarioView(createTerraformUi(store)),
    security: scenarioView(createSecurityUi(store)),
    haulage: scenarioView(createHaulageUi(store, SPACE_HAUL, SPACE_WORDS)),
    overland: scenarioView(createHaulageUi(store, LAND_HAUL, LAND_WORDS)),
    salvage: scenarioView(createSalvageUi(store)),
  };
  let view = views.extraction;
  // Slots hold only the running scenario's elements, so nothing hidden lingers in the accessibility tree.
  const statusSlot = h('div', { class: 'status-slot' });
  const monitorSlot = h('div', { class: 'monitor-slot' });
  const systemsSlot = h('div', { class: 'panel-slot' });
  const upgradesSlot = h('div', { class: 'panel-slot' });
  const contacts = stat('CONTACTS', 'Unknown contacts');
  contacts.el.classList.add('stat-alert');
  const offSick = stat('OFF SICK', 'Off sick');
  const turned = stat('TURNED', 'Turned');
  turned.el.classList.add('stat-alert');
  // The tabs are made below; alerts only reach for them on a tap, long after mounting.
  const alerts = createAlerts((panel) => tabs.select(panel));
  const status = h(
    'section',
    { class: 'status', 'aria-label': 'Ship status' },
    alerts.el,
    h('div', { class: 'status-target' }, targetBit, h('span', { class: 'status-target-name' })),
    statusSlot,
    h('dl', { class: 'stats stats-horror' }, contacts.el, offSick.el, turned.el),
  );
  const targetName = status.querySelector('.status-target-name')!;

  const log = createLogView();
  const drillBit = spriteCanvas('drill', 'drill-sprite');
  const drillLabel = h('span', { class: 'drill-label' });
  const drill = createActionButton({
    className: 'drill',
    label: 'Execute drill cycle',
    content: [drillBit, drillLabel],
    onPress: () => {
      const power = view.ui.action.perPress(store.getState().mission);
      store.dispatch(view.ui.action.action);
      sound.play('click');
      advanceFrame(drillBit);
      paintSprite(drillBit, palette);
      return `+${formatNumber(power)}`;
    },
  });
  // Outside the panels so it stays reachable on phones whichever tab is open.
  const drillBay = h('div', { class: 'drill-bay' }, guide.el, drill.el);

  const crew = createCrewPanel(store);
  const directives = createDirectivesPanel();
  const projects = createProjectsPanel(store);
  const sickBay = createSickBayPanel(store);
  const archive = createArchivePanel();
  const terminus = createTerminusPanel(store);
  // On desktop the ops column is always visible, so the side column shows systems while ops is selected.
  const tabs = createTabs<GameState>({
    label: 'Panels',
    home: 'ops',
    side: 'systems',
    root,
    panels: [
    {
      id: 'ops',
      label: 'OPS',
      short: 'OPS',
      content: [monitorSlot, log.el],
      render: (g) => {
        view.monitor.render(g.mission);
        const fresh = log.render(g.mission.log, `${g.mission.config.shipName}:${g.mission.seed}`);
        // Key clicks keep time with the lines printing; a memo's chime or an anomaly's drone closes the burst.
        if (fresh.length > 0) sound.typewriter(fresh.length);
        const last = fresh[fresh.length - 1];
        if (last && cueForLog(last.kind) !== 'teletype') sound.play(cueForLog(last.kind), Math.min(fresh.length, MAX_PRINTED_LINES) * PRINT_STAGGER + PRINT_SECONDS);
      },
    },
    {
      id: 'systems',
      label: 'SYSTEMS',
      short: 'SYS',
      content: [systemsSlot],
      render: (g) => view.ui.systems.render(g.mission),
    },
    {
      id: 'upgrades',
      label: 'UPGRADES',
      short: 'UPG',
      content: [upgradesSlot],
      render: (g) => view.ui.upgrades.render(g.mission),
      visible: (g) => views[g.mission.scenario].ui.upgrades.hasAny(g.mission),
    },
    {
      id: 'crew',
      label: 'CREW',
      short: 'CREW',
      el: crew.el,
      render: (g) => crew.render(g.mission),
      visible: (g) => isCrewUnlocked(g.mission),
      attention: (g) => {
        const { exhausted, tiring } = crewNeedingAttention(g.mission);
        return exhausted.length > 0 ? 'alert' : tiring.length > 0 ? 'active' : null;
      },
    },
    {
      id: 'directives',
      label: 'DIRECTIVES',
      short: 'DIR',
      el: directives.el,
      render: (g) => directives.render(g.mission),
      visible: (g) => hasDirectivesToShow(g.mission),
      attention: (g) => (g.mission.directive ? 'active' : null),
    },
    {
      id: 'projects',
      label: 'SPECIAL PROJECTS',
      short: 'S.P.',
      el: projects.el,
      render: (g) => isOrganism(g.mission) && projects.render(g.mission),
      visible: (g) => isOrganism(g.mission) && isSpecialProjectsUnlocked(g.mission),
    },
    {
      id: 'sickbay',
      label: 'SICK BAY',
      short: 'MED',
      el: sickBay.el,
      render: (g) => isOutbreak(g.mission) && sickBay.render(g.mission),
      visible: (g) => isOutbreak(g.mission) && g.mission.act >= 2,
      attention: (g) => (!isOutbreak(g.mission) ? null : g.mission.turned > 0 ? 'alert' : g.mission.sick >= SICK_ATTENTION ? 'active' : null),
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
    ],
  });

  const shell = createShell(root, {
    className: 'shell',
    parts: [masthead, status, ...tabs.sections, drillBay, tabs.tabbar],
    overlays: [settings.dialog, restricted.dialog, assignment.el, creatureView.el, hunterView.el, boardroomView.el, guide.rulesDialog],
  });
  let palette = readPalette(root);
  paintAll(root);
  let paintedAct = 0;
  let lastGlitch = -Infinity;
  let lastPing = -Infinity;
  let lastElapsed: number | null = null;
  let autoClock = 0;

  /** Swap every scenario-specific part of the screen when the running scenario changes. */
  function showScenario(id: ScenarioId) {
    view = views[id];
    root.dataset.scenario = id;
    statusSlot.replaceChildren(view.status);
    monitorSlot.replaceChildren(view.monitor.el);
    systemsSlot.replaceChildren(view.ui.systems.el);
    upgradesSlot.replaceChildren(view.ui.upgrades.el);
    drill.setLabel(view.ui.action.aria, view.ui.action.label);
    const sprites = view.ui.sprites ?? DEFAULT_SPRITES;
    setSprite(vesselBit, sprites.vessel);
    setSprite(targetBit, sprites.target);
    setSprite(drillBit, sprites.action);
    paintAll(root);
    lastElapsed = null;
  }

  function render(game: GameState) {
    creatureView.render(game);
    guide.render(game);
    hunterView.render(game);
    boardroomView.render(game);
    restricted.render(game);
    // Behind a full-screen layer (a horror tier, the Boardroom, choosing a contract) the contract is out of reach.
    const covered = game.mode !== 'mission' || !!game.assigning;
    shell.cover(covered);
    if (root.dataset.mode !== game.mode) root.dataset.mode = game.mode;
    const m = game.mission;
    if (root.dataset.scenario !== m.scenario) showScenario(m.scenario);
    setText(shipName, m.config.shipName.toUpperCase());
    setText(targetName, m.config.targetBody.toUpperCase());
    setText(clock, `T+${formatClock(m.elapsed)}`);
    view.flow.render(m);
    view.ui.controls?.render(m);
    for (const s of view.stats) setText(s.value, s.spec.read(m));
    autoCycle(m);
    if (root.dataset.act !== String(m.act)) root.dataset.act = String(m.act);
    const motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    if (root.dataset.motion !== motion) root.dataset.motion = motion;
    sound.setEnabled(game.profile.settings.sound);
    sound.setHum(game.mode === 'mission' ? game.mission.act : 0);
    settings.render(game);
    assignment.render(game);
    const tracking = m.flags.includes('tracker');
    contacts.el.hidden = !tracking;
    // The outbreak's figures: staff off sick from act II (a flu), the turned from act IV.
    offSick.el.hidden = !isOutbreak(m) || m.act < 2;
    turned.el.hidden = !isOutbreak(m) || m.act < 4;
    if (isOutbreak(m)) {
      setText(offSick.value, `${Math.round(m.sick * 100)}%`);
      setText(turned.value, `${Math.round(m.turned * 100)}%`);
    }
    contacts.el.parentElement!.hidden = contacts.el.hidden && offSick.el.hidden && turned.el.hidden;
    const loose = isOrganism(m) ? m.contacts : 0;
    setText(contacts.value, String(loose));
    const alert = String(loose > 0);
    if (root.dataset.alert !== alert) root.dataset.alert = alert;
    repaintSprites(m.act, m.elapsed);
    if (loose > 0 && m.elapsed - lastPing >= TRACKER_PING_INTERVAL) {
      lastPing = m.elapsed;
      sound.play('ping');
    }
    alerts.render(m);
    tabs.render(game);
  }

  /** WARDEN's automation visibly presses the button on its own. */
  function autoCycle(m: GameState['mission']) {
    const cycles = view.ui.action.autoRate(m);
    const auto = cycles > 0 ? 'on' : 'off';
    if (drill.el.dataset.auto !== auto) drill.el.dataset.auto = auto;
    const dt = lastElapsed === null || m.elapsed < lastElapsed ? 0 : m.elapsed - lastElapsed;
    lastElapsed = m.elapsed;
    if (cycles === 0) return;
    const interval = 1 / Math.min(cycles, MAX_AUTO_TICKS_PER_SECOND);
    autoClock += dt;
    if (autoClock < interval) return;
    autoClock = Math.min(autoClock - interval, interval);
    const perPress = view.ui.action.autoYieldPerSecond(m) * interval;
    drill.tick(`+${formatNumber(perPress)}`, 'drill-tick is-auto');
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
