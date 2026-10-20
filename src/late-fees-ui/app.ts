import { formatNumber } from '../shared/format';
import { h, setText } from '../shared/ui/dom';
import { createFlow } from '../shared/ui/flow';
import { createLogView } from '../shared/ui/log';
import { ZONES } from '../late-fees-data/camp';
import {
  DAY_LENGTH,
  NIGHT_FROM,
  incomeRate,
  isNight,
  lightDemand,
  lightSupply,
  prepForce,
  staff,
  watchForce,
  watchNeeded,
  whistlePower,
} from '../late-fees/camp/economy';
import type { LateGame } from '../late-fees/game';
import type { CampRun, EntryKind } from '../late-fees/state';
import type { LateStore } from '../late-fees/store';
import { frontier } from '../shared/ground';
import { createCredits } from './credits';
import { createSetup } from './setup';
import { createShelf } from './shelf';
import { createSplit, createStaffPanel, createStorePanel, createZones } from './camp';

/** The VCR's tape counter: H:MM:SS. */
export function tapeCounter(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function stat(label: string, aria: string) {
  const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
  return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
}

interface Panel {
  id: string;
  label: string;
  el: HTMLElement;
  render(game: LateGame): void;
  visible?(game: LateGame): boolean;
  attention?(game: LateGame): boolean;
}

export function mountLate(root: HTMLElement, store: LateStore): void {
  const setup = createSetup(store);
  const shelf = createShelf(store);
  const title = h('span', { class: 'osd-title' });
  const counter = h('span', { class: 'osd-counter', 'aria-label': 'Tape counter' }, '0:00:00');
  const rec = h('span', { class: 'osd-rec', 'aria-hidden': 'true' }, '● REC');
  const banner = h(
    'header',
    { class: 'osd' },
    h('div', { class: 'osd-left' }, h('span', { class: 'osd-play' }, 'PLAY ▶'), title),
    h('div', { class: 'osd-right' }, rec, h('span', { class: 'osd-sp' }, 'SP'), counter, setup.button),
  );

  const flow = createFlow<CampRun>({
    cells: [
      { label: 'LIGHT', aria: 'Light', unit: 'LM' },
      { label: 'PREP', aria: 'Prep work', unit: 'STAFF' },
      { label: 'TAKINGS', aria: 'Takings', unit: '$/S' },
    ],
    meterLabel: 'Next zone prepared',
    rateUnit: '$/S',
    identity: (r) => `${r.config.title}:${r.seed}`,
    read: (r) => {
      const line = frontier(r.zones);
      const base = {
        values: [lightSupply(r), prepForce(r), incomeRate(r)] as [number, number, number],
        meter: line < ZONES.length ? r.zones[line]!.control * 100 : 100,
        rate: incomeRate(r),
      };
      const need = watchNeeded(r);
      if (staff(r) === 0) return { ...base, limit: 'staff', highlight: 1, severe: false, note: 'NO STAFF · BLOW THE WHISTLE OR HIRE COUNSELORS' };
      if (watchForce(r) < need) {
        return { ...base, limit: 'watch', highlight: 2, severe: true, note: `NOT ENOUGH ON WATCH · ${formatNumber(watchForce(r))} OF ${formatNumber(need)} · ZONES GOING DARK` };
      }
      if (lightDemand(r) > lightSupply(r)) {
        return { ...base, limit: 'light', highlight: 0, severe: true, note: `TOO DARK TO WORK · ${formatNumber(lightDemand(r) - lightSupply(r))} LM SHORT · BUY LIGHTS` };
      }
      if (line >= ZONES.length) return { ...base, limit: 'open', highlight: null, severe: false, note: 'EVERY ZONE OPEN · ALL THE WAY TO WHERE HE DROWNED' };
      return { ...base, limit: 'staff', highlight: 1, severe: false, note: `PREPPING ${ZONES[line]!.name}` };
    },
  });

  const cash = stat('CASH', 'Cash');
  const dead = stat('BODY COUNT', 'Body count');
  dead.el.classList.add('stat-dead');
  const rep = stat('REPUTATION', 'Reputation');
  const clock = stat('TIME', 'Time of day');
  const status = h('section', { class: 'status', 'aria-label': 'Camp status' }, h('dl', { class: 'stats' }, cash.el, dead.el, rep.el, clock.el), flow.el);

  const zones = createZones();
  const split = createSplit(store);
  const log = createLogView<EntryKind>({ label: 'Camp log', stamp: tapeCounter });
  const staffPanel = createStaffPanel(store);
  const storePanel = createStorePanel(store);
  const credits = createCredits(store);
  const camp = (g: LateGame) => g.run as CampRun;
  const section = (id: string, label: string, ...children: HTMLElement[]) =>
    h('section', { class: `panel panel-${id}`, role: 'tabpanel', id: `lf-panel-${id}`, 'aria-labelledby': `lf-tab-${id}`, 'aria-label': label }, ...children);
  const panels: Panel[] = [
    {
      id: 'camp',
      label: 'CAMP',
      el: section('camp', 'Camp', split.el, zones.el, log.el),
      render: (g) => {
        split.render(camp(g));
        zones.render(camp(g));
        log.render(g.run.log, `${g.run.config.title}:${g.run.seed}`);
      },
    },
    { id: 'staff', label: 'STAFF', el: section('staff', 'Staff', staffPanel.el), render: (g) => staffPanel.render(camp(g)) },
    {
      id: 'store',
      label: 'STORE',
      el: section('store', 'Store', storePanel.el),
      render: (g) => storePanel.render(camp(g)),
      attention: (g) => storePanel.hasAffordable(camp(g)),
    },
    {
      id: 'credits',
      label: 'CREDITS',
      el: section('credits', 'Credits', credits.el),
      render: (g) => credits.render(g),
      visible: (g) => g.run.flags.includes('terminus'),
      attention: () => true,
    },
  ];
  const tabs = panels.map((p) => {
    const b = h('button', { class: 'tab', role: 'tab', id: `lf-tab-${p.id}`, 'aria-controls': `lf-panel-${p.id}`, type: 'button' }, p.label);
    b.addEventListener('click', () => select(p.id));
    return b;
  });
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Sections' }, ...tabs);
  function select(id: string) {
    root.dataset.tab = id;
    // On desktop the camp is always shown; the side column shows the chosen section (staff by default).
    const side = id === 'camp' ? 'staff' : id;
    panels.forEach((p, i) => {
      p.el.classList.toggle('is-active', p.id === id);
      p.el.classList.toggle('is-side', p.id === side);
      tabs[i]!.setAttribute('aria-selected', String(p.id === id));
    });
  }

  const whistleLabel = h('span', { class: 'whistle-label' }, 'BLOW THE WHISTLE');
  const whistle = h('button', { class: 'whistle', type: 'button', 'aria-label': 'Blow the whistle' }, whistleLabel);
  const blow = () => {
    const power = whistlePower(store.getState().run as CampRun);
    store.dispatch({ type: 'whistle' });
    const tick = h('span', { class: 'whistle-tick', 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 80 - 40)}px` }, `+${formatNumber(power)}`);
    whistle.append(tick);
    setTimeout(() => tick.remove(), 700);
  };
  whistle.addEventListener('pointerdown', (e) => {
    if (e.button === 0) blow();
  });
  whistle.addEventListener('click', (e) => {
    if (e.detail === 0) blow();
  });

  root.classList.add('vhs-shell');
  root.replaceChildren(
    banner,
    status,
    ...panels.map((p) => p.el),
    h('div', { class: 'whistle-bay' }, whistle),
    tabbar,
    h('div', { class: 'vhs-noise', 'aria-hidden': 'true' }),
    shelf.el,
    setup.dialog,
  );
  select('camp');

  function render(game: LateGame) {
    const r = camp(game);
    setText(title, r.config.title);
    setText(counter, tapeCounter(r.elapsed));
    const night = isNight(r);
    root.dataset.night = String(night);
    root.dataset.motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    flow.render(r);
    setText(cash.value, `$${formatNumber(r.cash)}`);
    setText(dead.value, formatNumber(r.bodyCount));
    setText(rep.value, `${Math.round(r.reputation * 100)}%`);
    const into = r.elapsed % DAY_LENGTH;
    setText(clock.value, night ? `NIGHT · ${Math.ceil((DAY_LENGTH - into) / 60)}M TO DAWN` : `DAY · ${Math.ceil((NIGHT_FROM - into) / 60)}M TO DUSK`);
    shelf.render(game);
    setup.render(game);
    panels.forEach((p, i) => {
      const shown = p.visible?.(game) ?? true;
      tabs[i]!.hidden = !shown;
      const lit = shown && (p.attention?.(game) ?? false);
      if (lit) tabs[i]!.dataset.attention = 'active';
      else delete tabs[i]!.dataset.attention;
      if (!shown) {
        if (root.dataset.tab === p.id) select('camp');
        return;
      }
      p.render(game);
    });
  }

  store.subscribe(render);
  render(store.getState());
}
