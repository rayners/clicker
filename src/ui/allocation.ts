import type { Store } from '../core/store';
import { LINES, type Line } from '../data/terraform/systems';
import { isAutoBalanced, linePower, lineStates, planetReadings, power, spec, type LineState } from '../mission/terraform/economy';
import type { TerraformMission } from '../mission/state';
import { h, setText } from './dom';

const STATE_TEXT: Record<LineState, string> = {
  'power-limited': 'POWER-LIMITED',
  'processor-limited': 'AT CAPACITY',
  idle: 'NO PROCESSORS',
};

const READING_FORMAT: Record<Line, (v: number) => string> = {
  atmosphere: (v) => `${v.toFixed(1)} KPA`,
  heat: (v) => `${Math.round(v)} K`,
  water: (v) => `${Math.round(v)}%`,
};

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** One-tap ±10% power steps per line, the spec target beside each, and what is holding each line back. */
export function createAllocation(store: Store): { el: HTMLElement; render(m: TerraformMission): void } {
  const rows = LINES.map((line) => {
    const share = h('span', { class: 'alloc-share', 'aria-label': `${title(line.name)} share` }, '0%');
    const target = h('span', { class: 'alloc-target' });
    const state = h('span', { class: 'alloc-state' });
    const reading = h('span', { class: 'alloc-reading' });
    const less = h('button', { class: 'alloc-step', type: 'button', 'aria-label': `Less power to ${line.name.toLowerCase()}` }, '−');
    const more = h('button', { class: 'alloc-step', type: 'button', 'aria-label': `More power to ${line.name.toLowerCase()}` }, '+');
    less.addEventListener('click', () => store.dispatch({ type: 'allocate', line: line.id, step: -1 }));
    more.addEventListener('click', () => store.dispatch({ type: 'allocate', line: line.id, step: 1 }));
    const steps = h('div', { class: 'alloc-steps' }, less, share, more);
    const el = h(
      'div',
      { class: 'alloc-line', 'data-line': line.id },
      h('div', { class: 'alloc-head' }, h('span', { class: 'alloc-name' }, line.short), target),
      steps,
      state,
      reading,
    );
    return { line, el, share, target, state, reading, less, more, steps };
  });
  const auto = h('p', { class: 'alloc-auto' }, 'WARDEN BALANCING · MANUAL ALLOCATION DISABLED');
  const el = h('section', { class: 'alloc', 'aria-label': 'Power allocation' }, h('div', { class: 'alloc-grid' }, ...rows.map((r) => r.el)), auto);

  function render(m: TerraformMission) {
    const automated = isAutoBalanced(m);
    const targets = spec(m);
    const states = lineStates(m);
    const readings = planetReadings(m);
    const supply = power(m);
    const given = linePower(m);
    auto.hidden = !automated;
    el.dataset.auto = String(automated);
    for (const r of rows) {
      const pct = automated ? Math.round((given[r.line.id] / supply) * 100) : m.allocation[r.line.id] * 10;
      setText(r.share, `${pct}%`);
      setText(r.target, `SPEC ${Math.round(targets[r.line.id] * 100)}%`);
      setText(r.state, STATE_TEXT[states[r.line.id]]);
      setText(r.reading, READING_FORMAT[r.line.id](readings[r.line.id]));
      r.el.dataset.state = states[r.line.id];
      // Removed rather than disabled, so WARDEN's control is unambiguous.
      r.less.hidden = automated;
      r.more.hidden = automated;
    }
  }

  return { el, render };
}
