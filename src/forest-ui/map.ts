import { h, setAttr, setText } from '../shared/ui/dom';
import { frontier } from '../forest/company';
import type { Company } from '../forest/state';

const BAR_CELLS = 16;

/** Always-visible progress toward the next region: the answer to "what takes us deeper?" */
export function createMapStrip(open: () => void): { el: HTMLElement; render(c: Company): void } {
  const where = h('span', { class: 'map-where' });
  const bar = h('span', { class: 'map-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Charted' });
  const count = h('span', { class: 'map-count' });
  const hint = h('span', { class: 'map-hint' });
  const el = h('button', { class: 'map-strip', type: 'button', 'aria-label': 'The map' }, h('span', { class: 'map-head' }, where, count), bar, hint);
  el.addEventListener('click', open);

  function render(c: Company) {
    const f = frontier(c);
    if (!f.next) {
      setText(where, `THE MAP · ${f.region.name} REACHED`);
      setText(count, '');
      setText(hint, 'NO CHART GOES FURTHER.');
      setAttr(bar, 'aria-valuenow', '100');
      setText(bar, '▰'.repeat(BAR_CELLS));
      return;
    }
    const filled = Math.floor(f.progress * BAR_CELLS);
    setText(where, `THE MAP · TOWARD ${f.next.name}`);
    setText(count, `${c.charted.toFixed(1)} / ${f.next.opensAt} LEAGUES`);
    setText(bar, '▰'.repeat(filled) + '▱'.repeat(BAR_CELLS - filled));
    setAttr(bar, 'aria-valuenow', String(Math.round(f.progress * 100)));
    setAttr(bar, 'aria-label', `Charted toward ${f.next.name.toLowerCase()}`);
    setText(hint, `PARTIES BACK FROM ${f.region.name} CHART THE WAY · SCOUTS CHART FASTER`);
  }

  return { el, render };
}
