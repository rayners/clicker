/**
 * The three-stage production readout that highlights the limiting stage.
 * @module
 */
import { formatNumber } from '../format';
import { h, setAttr, setText } from './dom';

/** One of the three stages in the production flow readout (e.g. extract, refine, income). */
export interface FlowCell {
  label: string;
  /** Accessible name of the value. */
  aria: string;
  unit: string;
}

/** The readout at one moment: the three values, the meter, and what is holding production back. */
export interface FlowReading {
  values: [number, number, number];
  /** 0-100 for the meter under the cells. */
  meter: number;
  /** What is holding production back; exposed as data-bottleneck for styling and tests. */
  limit: string;
  /** Which cell to highlight as the constraint, if any. */
  highlight: number | null;
  /** Inverted highlight: the constraint is saturated. */
  severe: boolean;
  note: string;
  /** The headline rate whose changes get a call-out. */
  rate: number;
}

/** How a game fills the production flow readout: its three cells and how to read them off the state. */
export interface FlowSpec<S> {
  cells: [FlowCell, FlowCell, FlowCell];
  meterLabel: string;
  rateUnit: string;
  read(state: S): FlowReading;
  /** Changes when a new run starts, so the first reading of a new run isn't called out as a change. */
  identity(state: S): string;
}


const DELTA_LIFETIME = 1400;

/**
 * The paperclip-style balance at the top of the screen: input, conversion and income, with whichever
 * stage is holding production back highlighted. Changes to the headline rate get an immediate call-out.
 */
export function createFlow<S>(spec: FlowSpec<S>): { el: HTMLElement; render(state: S): void } {
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

  function render(state: S) {
    const r = spec.read(state);
    const contract = spec.identity(state);
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
