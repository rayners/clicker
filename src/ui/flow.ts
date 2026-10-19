import { formatNumber } from '../core/format';
import type { MissionState } from '../mission/state';
import { h, setAttr, setText } from './dom';
import type { FlowSpec } from './scenarios/types';

const DELTA_LIFETIME = 1400;

/**
 * The paperclip-style balance at the top of the screen: input, conversion and income, with whichever
 * stage is holding production back highlighted. Changes to the headline rate get an immediate call-out.
 */
export function createFlow(spec: FlowSpec): { el: HTMLElement; render(m: MissionState): void } {
  const cells = spec.cells.map((c, i) => {
    const value = h('span', { class: 'flow-value', 'aria-label': c.aria }, '0');
    const el = h(
      'div',
      { class: `flow-cell flow-cell-${i}` },
      h('span', { class: 'flow-label' }, c.label),
      value,
      h('span', { class: 'flow-unit' }, c.unit),
    );
    return { el, value };
  });
  const fill = h('span', { class: 'flow-fill' });
  const meter = h(
    'div',
    { class: 'flow-meter', role: 'meter', 'aria-label': spec.meterLabel, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 },
    fill,
  );
  const note = h('p', { class: 'flow-note' });
  const arrow = () => h('span', { class: 'flow-arrow', 'aria-hidden': 'true' }, '▸');
  const el = h(
    'section',
    { class: 'flow', 'aria-label': 'Production flow' },
    h('div', { class: 'flow-row' }, cells[0]!.el, arrow(), cells[1]!.el, arrow(), cells[2]!.el),
    meter,
    note,
  );
  const head = cells[0]!.el;

  let lastRate: number | null = null;
  let lastContract = '';

  function callOut(delta: number) {
    const sign = delta > 0 ? '+' : '-';
    const text = `${sign}${formatNumber(Math.abs(delta))} ${spec.rateUnit}`;
    const tag = h('span', { class: `rate-delta${delta < 0 ? ' is-loss' : ''}`, 'aria-hidden': 'true' }, text);
    head.append(tag);
    head.classList.remove('is-bumped');
    void head.offsetWidth; // restart the flash animation
    head.classList.add('is-bumped');
    setTimeout(() => tag.remove(), DELTA_LIFETIME);
  }

  function render(m: MissionState) {
    const r = spec.read(m);
    const contract = `${m.config.shipName}:${m.seed}`;
    // Rates only move on purchases and crew/containment changes, so any difference is worth showing.
    if (lastRate !== null && contract === lastContract && Math.abs(r.rate - lastRate) > Math.max(1e-9, lastRate * 1e-6)) {
      callOut(r.rate - lastRate);
    }
    lastRate = r.rate;
    lastContract = contract;

    r.values.forEach((v, i) => setText(cells[i]!.value, formatNumber(v)));
    cells.forEach((c, i) => c.el.classList.toggle('is-limit', r.highlight === i));
    const load = Math.round(r.meter);
    setAttr(meter, 'aria-valuenow', String(load));
    fill.style.width = `${load}%`;
    setAttr(el, 'data-bottleneck', r.limit);
    setAttr(el, 'data-severe', String(r.severe));
    setText(note, r.note);
  }

  return { el, render };
}
