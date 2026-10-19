import { formatClock } from '../core/format';
import { LOG_LIMIT, type LogEntry } from '../mission/log';
import { h } from './dom';

export function createLogView(): { el: HTMLOListElement; render(entries: LogEntry[], contract: string): LogEntry[] } {
  const el = h('ol', { class: 'log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Comms log' });
  let lastId = 0;
  let currentContract = '';

  function render(entries: LogEntry[], contract: string) {
    // A new contract restarts log ids: start the feed over.
    if (contract !== currentContract) {
      currentContract = contract;
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
        h('span', { class: 'log-time' }, `T+${formatClock(entry.t)}`),
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
