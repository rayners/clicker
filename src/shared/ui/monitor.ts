import { h, setText } from './dom';

export interface MonitorRow<S> {
  id: string;
  label: string;
  /** Seconds per visual work cycle. */
  period: number;
  running(state: S): boolean;
  count(state: S): string;
  output(state: S): string;
}


/** Every automated system currently working, each with a looping work-cycle bar. */
export function createMonitor<S>(rows: readonly MonitorRow<S>[]): { el: HTMLElement; render(state: S): void } {
  const list = h('ul', { class: 'mon-list' });
  const idle = h('p', { class: 'mon-idle' }, 'NO AUTOMATED SYSTEMS ONLINE · ACQUIRE IN SYSTEMS');
  const el = h('section', { class: 'monitor', 'aria-label': 'Operations monitor' }, list, idle);
  const items = new Map<string, { li: HTMLLIElement; count: HTMLElement; out: HTMLElement }>();
  let shown = '';

  function render(state: S) {
    const m = state;
    const running = rows.filter((r) => r.running(m));
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
      setText(item.out, r.output(m));
    }
  }

  return { el, render };
}
