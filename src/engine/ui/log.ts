import { LOG_LIMIT, type LogEntry } from '../log';
import { h } from './dom';

export interface LogViewOptions {
  /** Accessible name of the feed. */
  label: string;
  /** How an entry's game time is written. */
  stamp(t: number): string;
}

/** An append-only feed that prints only new entries, and starts over when a new run begins. */
export function createLogView<K extends string>(options: LogViewOptions): {
  el: HTMLOListElement;
  render(entries: readonly LogEntry<K>[], run: string): LogEntry<K>[];
} {
  const el = h('ol', { class: 'log', role: 'log', 'aria-live': 'polite', 'aria-label': options.label });
  let lastId = 0;
  let currentRun = '';

  function render(entries: readonly LogEntry<K>[], run: string) {
    // A new run restarts log ids: start the feed over.
    if (run !== currentRun) {
      currentRun = run;
      el.replaceChildren();
      lastId = 0;
    }
    const fresh = entries.filter((e) => e.id > lastId);
    if (fresh.length === 0) return fresh;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    fresh.forEach((entry, i) => {
      const li = h(
        'li',
        { class: `log-entry log-${entry.kind}`, style: `--delay:${i * 0.12}s` },
        h('span', { class: 'log-time' }, options.stamp(entry.t)),
        ' ',
        h('span', { class: 'log-text' }, entry.text),
      );
      el.append(li);
    });
    while (el.children.length > LOG_LIMIT) el.firstElementChild?.remove();
    lastId = fresh[fresh.length - 1]!.id;
    if (nearBottom) el.scrollTop = el.scrollHeight;
    return fresh;
  }

  return { el, render };
}
