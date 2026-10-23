import { isDocked, legDistance, legWindow } from '../mission/haulage/economy';
import { profileOf } from '../mission/haulage/profiles';
import type { HaulageMission } from '../mission/state';
import { formatDuration } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';

const BAR_CELLS = 20;

/** Where the train is: the next station, how far along the leg, the delivery window and the freight's condition. */
export function createRoute(): { el: HTMLElement; render(m: HaulageMission): void } {
  const station = h('span', { class: 'route-station' });
  const legs = h('span', { class: 'route-legs' });
  const bar = h('span', { class: 'route-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Leg travelled' });
  const deadline = h('span', { class: 'route-window', 'aria-label': 'Delivery window' });
  const condition = h('span', { class: 'route-condition', 'aria-label': 'Freight condition' });
  const el = h(
    'section',
    { class: 'route', 'aria-label': 'Route' },
    h('div', { class: 'route-head' }, h('span', { class: 'route-to' }, 'NEXT: ', station), legs),
    bar,
    h('div', { class: 'route-foot' }, h('span', {}, 'WINDOW ', deadline), h('span', {}, 'FREIGHT ', condition)),
  );

  function render(m: HaulageMission) {
    setText(station, profileOf(m).station(m.leg));
    setText(legs, `LEG ${m.leg + 1}`);
    const progress = isDocked(m) ? 0 : m.travelled / legDistance(m);
    const filled = Math.floor(progress * BAR_CELLS);
    setText(bar, '▰'.repeat(filled) + '▱'.repeat(BAR_CELLS - filled));
    setAttr(bar, 'aria-valuenow', String(Math.round(progress * 100)));
    const left = legWindow(m, m.leg) - m.legTime;
    setText(deadline, isDocked(m) ? `DOCKED ${formatDuration(m.docked)}` : left > 0 ? `${formatDuration(left)} LEFT` : 'MISSED');
    el.dataset.window = left > 0 ? 'open' : 'missed';
    setText(condition, `${Math.round(m.condition * 100)}%`);
    el.dataset.damaged = String(m.condition < 1);
  }

  return { el, render };
}
