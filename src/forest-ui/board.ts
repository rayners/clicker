import { formatDuration } from '../engine/format';
import { h, setText } from '../engine/ui/dom';
import { CLASSES, CLASS_IDS } from '../forest-data/classes';
import { REGIONS } from '../forest-data/regions';
import { KEEP, type Company, type Party } from '../forest/state';
import { frontierFloor } from '../forest/company';

const BAR_CELLS = 14;

const roster = (p: Party) =>
  CLASS_IDS.filter((id) => p.comp[id] > 0)
    .map((id) => `${p.comp[id]} ${CLASSES.find((k) => k.id === id)!.short}`)
    .join(' · ');

/** Parties in the wood: where they went, who went, and how long until they're due back. */
export function createBoard(): { el: HTMLElement; render(c: Company): void } {
  const list = h('ul', { class: 'board-list' });
  const idle = h('p', { class: 'mon-idle' }, 'NO PARTIES IN THE WOOD · SEND ONE FROM EXPEDITIONS');
  const el = h('section', { class: 'board', 'aria-label': 'Operations board' }, list, idle);
  const items = new Map<number, { li: HTMLLIElement; bar: HTMLElement; due: HTMLElement }>();

  function render(c: Company) {
    const ids = new Set(c.parties.map((p) => p.id));
    for (const [id, item] of items) {
      if (!ids.has(id)) {
        item.li.remove();
        items.delete(id);
      }
    }
    for (const p of c.parties) {
      let item = items.get(p.id);
      if (!item) {
        const bar = h('span', { class: 'board-bar', 'aria-hidden': 'true' });
        const due = h('span', { class: 'board-due' });
        const name = p.region === KEEP ? (frontierFloor(c)?.name ?? 'MORROWGATE KEEP') : REGIONS.find((r) => r.id === p.region)!.name;
        const li = h(
          'li',
          { class: 'board-row', 'data-region': p.region },
          h('span', { class: 'board-name' }, name),
          h('span', { class: 'board-roster' }, roster(p)),
          bar,
          due,
        );
        item = { li, bar, due };
        items.set(p.id, item);
        list.append(li);
      }
      const progress = Math.min(1, (c.elapsed - p.departedAt) / (p.returnsAt - p.departedAt));
      const filled = Math.floor(progress * BAR_CELLS);
      setText(item.bar, '▰'.repeat(filled) + '▱'.repeat(BAR_CELLS - filled));
      setText(item.due, `DUE ${formatDuration(Math.max(0, p.returnsAt - c.elapsed))}`);
    }
    idle.hidden = c.parties.length > 0;
    setText(idle, c.site === 'keep' ? 'NO PARTIES IN THE KEEP · SEND ONE FROM EXPEDITIONS' : 'NO PARTIES IN THE WOOD · SEND ONE FROM EXPEDITIONS');
  }

  return { el, render };
}
