import { formatNumber } from '../core/format';
import { GENERATORS } from '../data/extraction/generators';
import { autoDrillOutput, autoDrillRate, generatorRate } from '../mission/extraction/economy';
import type { MissionState } from '../mission/state';
import { h, setText } from './dom';

/** Seconds per visual work cycle; deeper systems run slower, heavier cycles. */
const AUTOCYCLE_PERIOD = 1;
const PERIOD_BASE = 1.2;
const PERIOD_STEP = 0.45;

interface Row {
  id: string;
  label: string;
  period: number;
  count(m: MissionState): string;
  output(m: MissionState): number;
}

const ROWS: Row[] = [
  {
    id: 'autocycle',
    label: 'AUTOCYCLE',
    period: AUTOCYCLE_PERIOD,
    count: (m) => `${formatNumber(autoDrillRate(m))} CYC/S`,
    output: autoDrillOutput,
  },
  ...GENERATORS.map((g, i) => ({
    id: g.id,
    label: g.short,
    period: PERIOD_BASE + i * PERIOD_STEP,
    count: (m: MissionState) => `×${m.generators[g.id] ?? 0}`,
    output: (m: MissionState) => (m.generators[g.id] ?? 0) * generatorRate(m, g),
  })),
];

function isRunning(m: MissionState, row: Row): boolean {
  return row.id === 'autocycle' ? autoDrillRate(m) > 0 : (m.generators[row.id] ?? 0) > 0;
}

/** Every automated system currently working, each with a looping work-cycle bar. */
export function createMonitor(): { el: HTMLElement; render(m: MissionState): void } {
  const list = h('ul', { class: 'mon-list' });
  const idle = h('p', { class: 'mon-idle' }, 'NO AUTOMATED SYSTEMS ONLINE · ACQUIRE IN SYSTEMS');
  const el = h('section', { class: 'monitor', 'aria-label': 'Operations monitor' }, list, idle);
  const items = new Map<string, { li: HTMLLIElement; count: HTMLElement; out: HTMLElement }>();
  let shown = '';

  function render(m: MissionState) {
    const running = ROWS.filter((r) => isRunning(m, r));
    const key = running.map((r) => r.id).join(',');
    if (key !== shown) {
      shown = key;
      list.replaceChildren(
        ...running.map((r) => {
          let item = items.get(r.id);
          if (!item) {
            const count = h('span', { class: 'mon-count' });
            const out = h('span', { class: 'mon-out' });
            const li = h(
              'li',
              { class: 'mon-row', 'data-system': r.id, style: `--period:${r.period}s` },
              h('span', { class: 'mon-name' }, r.label),
              count,
              h('span', { class: 'mon-bar', 'aria-hidden': 'true' }, h('i')),
              out,
            );
            item = { li, count, out };
            items.set(r.id, item);
          }
          return item.li;
        }),
      );
      idle.hidden = running.length > 0;
    }
    for (const r of running) {
      const item = items.get(r.id)!;
      setText(item.count, r.count(m));
      setText(item.out, `${formatNumber(r.output(m))}/S`);
    }
  }

  return { el, render };
}
