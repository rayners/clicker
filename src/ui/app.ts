import { formatClock, formatNumber } from '../core/format';
import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { oreRate, refineryCapacity } from '../mission/economy';
import { h, setText } from './dom';
import { createLogView } from './log';
import { createSystemsPanel } from './systems';

const TABS = [
  { id: 'ops', label: 'OPS' },
  { id: 'systems', label: 'SYSTEMS' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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
    h('div', { class: 'mast-line' }, shipName, clock),
  );

  const ore = stat('ORE', 'Ore');
  const rate = stat('ORE/S', 'Ore per second');
  const credits = stat('CREDITS', 'Credits');
  const refinery = stat('REFINE/S', 'Refinery throughput');
  const status = h(
    'section',
    { class: 'status', 'aria-label': 'Ship status' },
    h('dl', { class: 'stats' }, ore.el, credits.el, rate.el, refinery.el),
  );

  const log = createLogView();
  const drill = h('button', { class: 'drill', type: 'button' }, h('span', { class: 'drill-label' }, 'EXECUTE DRILL CYCLE'));
  drill.setAttribute('aria-label', 'Execute drill cycle');
  const drillOnce = () => {
    store.dispatch({ type: 'drill' });
    spawnTick(drill);
  };
  // pointerdown fires immediately on touch (no click delay) so rapid tapping on phones feels right.
  drill.addEventListener('pointerdown', (e) => {
    if (e.button === 0) drillOnce();
  });
  // Keyboard activation produces a click with detail 0; pointer clicks were already handled above.
  drill.addEventListener('click', (e) => {
    if (e.detail === 0) drillOnce();
  });

  const ops = h(
    'section',
    { class: 'panel panel-ops', role: 'tabpanel', id: 'panel-ops', 'aria-labelledby': 'tab-ops' },
    log.el,
  );
  // Outside the panels so it stays reachable on phones whichever tab is open.
  const drillBay = h('div', { class: 'drill-bay' }, drill);

  const systems = createSystemsPanel(store);

  const tabButtons = TABS.map((t) => {
    const b = h('button', { class: `tab tab-${t.id}`, role: 'tab', id: `tab-${t.id}`, 'aria-controls': `panel-${t.id}`, type: 'button' }, t.label);
    b.addEventListener('click', () => selectTab(t.id));
    return b;
  });
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Panels' }, ...tabButtons);

  function selectTab(id: TabId) {
    root.dataset.tab = id;
    tabButtons.forEach((b, i) => b.setAttribute('aria-selected', String(TABS[i]!.id === id)));
  }

  root.classList.add('shell');
  root.replaceChildren(masthead, status, ops, systems.el, drillBay, tabbar);
  selectTab('ops');

  function render(game: GameState) {
    const m = game.mission;
    setText(shipName, m.config.shipName.toUpperCase());
    setText(clock, `T+${formatClock(m.elapsed)}`);
    setText(ore.value, formatNumber(m.ore));
    setText(credits.value, formatNumber(m.credits));
    setText(rate.value, formatNumber(oreRate(m)));
    setText(refinery.value, formatNumber(refineryCapacity(m)));
    log.render(m.log);
    systems.render(m);
  }

  store.subscribe(render);
  render(store.getState());
}

function spawnTick(anchor: HTMLElement) {
  const tick = h('span', { class: 'drill-tick', 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 60 - 30)}px` }, '+1');
  anchor.append(tick);
  setTimeout(() => tick.remove(), 700);
}
