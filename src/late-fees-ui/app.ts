import { formatNumber } from '../shared/format';
import { h, setText } from '../shared/ui/dom';
import { createLogView } from '../shared/ui/log';
import type { LateGame } from '../late-fees/game';
import type { EntryKind } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';
import { createCredits } from './credits';
import { createSetup } from './setup';
import { createShelf } from './shelf';
import { createVenueUis, type VenueUi } from './venues';
import { createCutView } from './cut';
import { createGuideView } from '../shared/ui/guide';
import { createGuideProgress } from '../shared/guide';
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

interface Panel {
  id: string;
  el: HTMLElement;
  tab: HTMLButtonElement;
  render(game: LateGame): void;
  visible?(game: LateGame): boolean;
  attention?(game: LateGame): boolean;
}

/** The guide's progress is a per-device convenience, kept apart from the save. */
const GUIDE_KEY = 'latefees.guide';

export function mountLate(root: HTMLElement, store: LateStore): void {
  const setup = createSetup(store);
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
  const status = h('section', { class: 'status', 'aria-label': 'Status' }, h('dl', { class: 'stats' }, cash.el, dead.el, rep.el, clock.el), flowSlot);

  const log = createLogView<EntryKind>({ label: 'Tape log', stamp: tapeCounter });
  const credits = createCredits(store);
  const section = (id: string, label: string, ...children: HTMLElement[]) =>
    h('section', { class: `panel panel-${id}`, role: 'tabpanel', id: `lf-panel-${id}`, 'aria-labelledby': `lf-tab-${id}`, 'aria-label': label }, ...children);
  const tab = (id: string, label: string) => {
    const b = h('button', { class: 'tab', role: 'tab', id: `lf-tab-${id}`, 'aria-controls': `lf-panel-${id}`, type: 'button' }, label);
    b.addEventListener('click', () => select(id));
    return b;
  };
  const panels: Panel[] = [
    {
      id: 'camp',
      el: section('camp', 'Main', mainSlot, log.el),
      tab: tab('camp', 'MAIN'),
      render: (g) => {
        view!.main.render(g.run);
        log.render(g.run.log, `${g.run.config.title}:${g.run.seed}`);
      },
    },
    { id: 'staff', el: section('staff', 'Staff', staffSlot), tab: tab('staff', 'STAFF'), render: (g) => view!.staff.render(g.run) },
    {
      id: 'store',
      el: section('store', 'Store', storeSlot),
      tab: tab('store', 'STORE'),
      render: (g) => view!.store.render(g.run),
      attention: (g) => view!.store.hasAffordable(g.run),
    },
    {
      id: 'credits',
      el: section('credits', 'Credits', credits.el),
      tab: tab('credits', 'CREDITS'),
      render: (g) => credits.render(g),
      visible: (g) => g.run.flags.includes('terminus'),
      attention: () => true,
    },
  ];
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Sections' }, ...panels.map((p) => p.tab));
  function select(id: string) {
    root.dataset.tab = id;
    // On desktop the main panel is always shown; the side column shows the chosen section (staff by default).
    const side = id === 'camp' ? 'staff' : id;
    for (const p of panels) {
      p.el.classList.toggle('is-active', p.id === id);
      p.el.classList.toggle('is-side', p.id === side);
      p.tab.setAttribute('aria-selected', String(p.id === id));
    }
  }

  const actionLabel = h('span', { class: 'whistle-label' });
  const action = h('button', { class: 'whistle', type: 'button' }, actionLabel);
  const press = () => {
    if (!view) return;
    const power = view.action.perPress(store.getState().run);
    store.dispatch(view.action.action);
    const tick = h('span', { class: 'whistle-tick', 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 80 - 40)}px` }, `+${formatNumber(power)}`);
    action.append(tick);
    setTimeout(() => tick.remove(), 700);
  };
  action.addEventListener('pointerdown', (e) => {
    if (e.button === 0) press();
  });
  action.addEventListener('click', (e) => {
    if (e.detail === 0) press();
  });

  /** Swap the running venue's elements into the slots. */
  function mountVenue(next: VenueUi) {
    view = next;
    flowSlot.replaceChildren(next.flow.el);
    mainSlot.replaceChildren(next.main.el);
    staffSlot.replaceChildren(next.staff.el);
    storeSlot.replaceChildren(next.store.el);
    setText(actionLabel, next.action.label);
    action.setAttribute('aria-label', next.action.aria);
    setText(clock.name, next.clock.label);
    clock.value.setAttribute('aria-label', next.clock.aria);
    setText(panels[1]!.tab, next.staffTab);
  }

  root.classList.add('vhs-shell');
  root.replaceChildren(
    banner,
    status,
    ...panels.map((p) => p.el),
    h('div', { class: 'whistle-bay' }, guide.el, action),
    tabbar,
    h('div', { class: 'vhs-noise', 'aria-hidden': 'true' }),
    cutView.el,
    shelf.el,
    setup.dialog,
    guide.rulesDialog,
  );
  select('camp');

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
    shelf.render(game);
    setup.render(game);
    cutView.render(game);
    guide.render(game);
    root.dataset.mode = game.mode;
    for (const p of panels) {
      const shown = p.visible?.(game) ?? true;
      p.tab.hidden = !shown;
      if (shown && (p.attention?.(game) ?? false)) p.tab.dataset.attention = 'active';
      else delete p.tab.dataset.attention;
      if (!shown) {
        if (root.dataset.tab === p.id) select('camp');
        continue;
      }
      p.render(game);
    }
  }

  store.subscribe(render);
  render(store.getState());
}
