import type { Store } from '../core/store';
import { LINES, type Line } from '../data/terraform/systems';
import { HUMAN_CLIMATE, isAutoBalanced, linePower, lineStates, planetReadings, power, spec, type LineState } from '../mission/terraform/economy';
import { TERRAFORM_UPGRADES } from '../data/terraform/upgrades';
import type { TerraformMission } from '../mission/state';
import { h, setText } from '../shared/ui/dom';

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

/** Within this share of the human value a reading counts as livable. */
const LIVABLE_TOLERANCE = 0.1;
const BALANCER = TERRAFORM_UPGRADES.find((u) => u.effect.kind === 'autoBalance')!.id;

/** ✓ near the human ideal, ▲ above it, ▼ below. */
function mark(line: Line, value: number): string {
  const ideal = HUMAN_CLIMATE[line];
  if (Math.abs(value - ideal) <= ideal * LIVABLE_TOLERANCE) return '✓';
  return value > ideal ? '▲' : '▼';
}

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
  const auto = h('p', { class: 'alloc-auto' }, 'WARDEN BALANCING · ALLOCATION FOLLOWS CORPORATE SPEC');
  // While WARDEN balances, the three lines fold into one summary: nothing to set, so no room spent on steps.
  const summary = h('p', { class: 'alloc-summary', 'aria-label': 'Power split' });
  const grid = h('div', { class: 'alloc-grid' }, ...rows.map((r) => r.el));
  const handover = h('button', { class: 'alloc-handover', type: 'button' });
  handover.addEventListener('click', () => store.dispatch({ type: 'toggleBalancer' }));
  const el = h('section', { class: 'alloc', 'aria-label': 'Power allocation' }, grid, summary, auto, handover);

  function render(m: TerraformMission) {
    const automated = isAutoBalanced(m);
    const targets = spec(m);
    const states = lineStates(m);
    const readings = planetReadings(m);
    const supply = power(m);
    const given = linePower(m);
    auto.hidden = !automated;
    grid.hidden = automated;
    summary.hidden = !automated;
    if (automated) setText(summary, rows.map((r) => `${r.line.short} ${Math.round((given[r.line.id] / supply) * 100)}%`).join(' · '));
    el.dataset.auto = String(automated);
    const installed = m.upgrades.includes(BALANCER);
    handover.hidden = !installed;
    const label = automated ? 'Take control from WARDEN' : 'Return control to WARDEN';
    setText(handover, label.toUpperCase());
    handover.setAttribute('aria-label', label);
    for (const r of rows) {
      const pct = automated ? Math.round((given[r.line.id] / supply) * 100) : m.allocation[r.line.id] * 10;
      setText(r.share, `${pct}%`);
      setText(r.target, `SPEC ${Math.round(targets[r.line.id] * 100)}%`);
      setText(r.state, STATE_TEXT[states[r.line.id]]);
      setText(r.reading, `${READING_FORMAT[r.line.id](readings[r.line.id])} ${mark(r.line.id, readings[r.line.id])}`);
      r.el.dataset.state = states[r.line.id];
      // Removed rather than disabled, so WARDEN's control is unambiguous.
      r.less.hidden = automated;
      r.more.hidden = automated;
    }
  }

  return { el, render };
}
