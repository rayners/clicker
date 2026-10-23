import { formatDuration, formatNumber } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { createLogView } from '../engine/ui/log';
import { createTabs } from '../engine/ui/tabs';
import { createActionButton } from '../engine/ui/action';
import { createShell } from '../engine/ui/shell';
import type { LateGame } from '../late-fees/game';
import type { EntryKind } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';
import { creditsIn } from '../late-fees/story';
import { createLateSound, soundCues } from './sound';
import type { Run } from '../late-fees/state';
import { createCredits } from './credits';
import { createSetup } from './setup';
import { createShelf } from './shelf';
import { createVenueUis, type VenueUi } from './venues';
import { createCutView } from './cut';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { lateGuideRules, lateGuideSteps } from '../late-fees-data/guide';

/** The VCR's tape counter: H:MM:SS. */
export function tapeCounter(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function stat(label: string, aria: string) {
  const name = h('dt', { class: 'stat-label' }, label);
  const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
  return { name, value, el: h('div', { class: 'stat' }, name, value) };
}

/** The guide's progress is a per-device convenience, kept apart from the save. */
const GUIDE_KEY = 'latefees.guide';

export function mountLate(root: HTMLElement, store: LateStore): void {
  const setup = createSetup(store);
  const sound = createLateSound();
  root.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  let pressed = false;
  let lastRun: Run | null = null;
  const shelf = createShelf(store);
  const cutView = createCutView(store);
  const venues = createVenueUis(store);
  let view: VenueUi | null = null;

  const guide = createGuideView<LateGame>({ steps: lateGuideSteps, rules: lateGuideRules, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const title = h('span', { class: 'osd-title' });
  const counter = h('span', { class: 'osd-counter', 'aria-label': 'Tape counter' }, '0:00:00');
  const banner = h(
    'header',
    { class: 'osd' },
    h('div', { class: 'osd-left' }, h('span', { class: 'osd-play' }, 'PLAY ▶'), title),
    h('div', { class: 'osd-right' }, h('span', { class: 'osd-rec', 'aria-hidden': 'true' }, '●', h('span', { class: 'osd-rec-text' }, ' REC')), h('span', { class: 'osd-sp' }, 'SP'), counter, guide.rulesButton, setup.button),
  );

  const cash = stat('CASH', 'Cash');
  const dead = stat('BODY COUNT', 'Body count');
  dead.el.classList.add('stat-dead');
  const rep = stat('REPUTATION', 'Reputation');
  const clock = stat('TIME', 'Time of day');
  // Slots hold only the running venue's elements, so nothing hidden lingers in the accessibility tree.
  const flowSlot = h('div', { class: 'venue-slot' });
  const mainSlot = h('div', { class: 'venue-slot' });
  const staffSlot = h('div', { class: 'venue-slot' });
  const storeSlot = h('div', { class: 'venue-slot' });
  // The film's last stretch is long; say when it ends, and once it has, where the ending is chosen.
  const finale = h('p', { class: 'finale', role: 'status', 'aria-label': 'Finale', hidden: true });
  const status = h('section', { class: 'status', 'aria-label': 'Status' }, h('dl', { class: 'stats' }, cash.el, dead.el, rep.el, clock.el), finale, flowSlot);

  const log = createLogView<EntryKind>({ label: 'Tape log', stamp: tapeCounter });
  const credits = createCredits(store);
  // On desktop the main panel is always shown; the side column shows the chosen section (staff by default).
  const tabs = createTabs<LateGame>({
    label: 'Sections',
    idPrefix: 'lf-',
    home: 'camp',
    side: 'staff',
    root,
    panels: [
      {
        id: 'camp',
        label: 'MAIN',
        content: [mainSlot, log.el],
        render: (g) => {
          view!.main.render(g.run);
          log.render(g.run.log, `${g.run.config.title}:${g.run.seed}`);
        },
      },
      { id: 'staff', label: 'STAFF', content: [staffSlot], render: (g) => view!.staff.render(g.run) },
      { id: 'store', label: 'STORE', content: [storeSlot], render: (g) => view!.store.render(g.run), attention: (g) => view!.store.hasAffordable(g.run) },
      { id: 'credits', label: 'CREDITS', content: [credits.el], render: (g) => credits.render(g), visible: (g) => g.run.flags.includes('terminus'), attention: () => true },
    ],
  });

  const action = createActionButton({
    className: 'whistle',
    label: 'Blow the whistle',
    content: [h('span', { class: 'whistle-label' })],
    onPress: () => {
      if (!view) return;
      const power = view.action.perPress(store.getState().run);
      pressed = true;
      store.dispatch(view.action.action);
      return `+${formatNumber(power)}`;
    },
  });

  /** Swap the running venue's elements into the slots. */
  function mountVenue(next: VenueUi) {
    view = next;
    flowSlot.replaceChildren(next.flow.el);
    mainSlot.replaceChildren(next.main.el);
    staffSlot.replaceChildren(next.staff.el);
    storeSlot.replaceChildren(next.store.el);
    action.setLabel(next.action.aria, next.action.label);
    setText(clock.name, next.clock.label);
    clock.value.setAttribute('aria-label', next.clock.aria);
    tabs.setLabel('staff', next.staffTab);
  }

  const shell = createShell(root, {
    className: 'vhs-shell',
    parts: [banner, status, ...tabs.sections, h('div', { class: 'whistle-bay' }, guide.el, action.el), tabs.tabbar],
    overlays: [h('div', { class: 'vhs-noise', 'aria-hidden': 'true' }), cutView.el, shelf.el, setup.dialog, guide.rulesDialog],
  });

  function render(game: LateGame) {
    const r = game.run;
    const next = venues[r.venue];
    if (next !== view) mountVenue(next);
    setText(title, r.config.title);
    setText(counter, tapeCounter(r.elapsed));
    root.dataset.night = String(view!.night(r));
    root.dataset.venue = r.venue;
    root.dataset.motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    view!.flow.render(r);
    setText(cash.value, `$${formatNumber(r.cash)}`);
    setText(dead.value, formatNumber(r.bodyCount));
    setText(rep.value, `${Math.round(r.reputation * 100)}%`);
    setText(clock.value, view!.clock.read(r));
    const left = creditsIn(r);
    const rolled = r.flags.includes('terminus');
    finale.hidden = left === null && !rolled;
    setText(finale, rolled ? 'CHOOSE AN ENDING IN CREDITS' : left === null ? '' : `FINAL ACT · CREDITS IN ${formatDuration(left)}`);
    shelf.render(game);
    setup.render(game);
    const playing = game.mode === 'films' && !game.shelf;
    sound.setEnabled(game.profile.settings.sound);
    sound.setHum(playing ? r.act : 0);
    // A new film starts the comparison over, so its first frame makes no sound of its own.
    if (playing && lastRun && lastRun.seed === r.seed) for (const cue of soundCues(lastRun, r, pressed)) sound.play(cue);
    pressed = false;
    lastRun = r;
    cutView.render(game);
    guide.render(game);
    // Behind the shelf or the Killer's Cut, the film is out of reach.
    shell.cover(game.mode !== 'films' || game.shelf);
    root.dataset.mode = game.mode;
    tabs.render(game);
  }

  store.subscribe(render);
  render(store.getState());
}
