import type { SectionState } from '../engine/ground';
import { frontier } from '../engine/ground';
import { h, setAttr, setText } from '../engine/ui/dom';

type SectorState = 'secured' | 'contested' | 'frontier' | 'lost';

export interface SiteSpec {
  sections: readonly { name: string; deep?: boolean }[];
  /** Accessible name of the column. */
  label: string;
  /** What each state reads as on screen. */
  words?: Partial<Record<SectorState, string>>;
}

/** Held ground as a column of sections from the entrance in: what is held, what is slipping, where the push is. */
export function createSite(spec: SiteSpec): { el: HTMLElement; render(m: { ground: SectionState[] }, frontierWord?: string): void } {
  const words = { secured: 'SECURED', contested: 'CONTESTED', frontier: 'FRONTIER', lost: 'LOST', ...spec.words };
  const rows = spec.sections.map((def) => {
    const fill = h('i', { class: 'site-fill' });
    const state = h('span', { class: 'site-state' });
    const el = h(
      'li',
      { class: 'site-row', 'data-state': 'lost', 'data-deep': String(Boolean(def.deep)) },
      h('span', { class: 'site-name' }, def.name),
      state,
      h('span', { class: 'site-bar', 'aria-hidden': 'true' }, fill),
    );
    return { el, fill, state };
  });
  // On a phone only the rows that matter show; these count the rest (hidden on wider screens, where every row fits).
  const moreHeld = h('p', { class: 'site-more' });
  const moreAhead = h('p', { class: 'site-more' });
  const el = h('section', { class: 'site', 'aria-label': spec.label }, moreHeld, h('ol', { class: 'site-list' }, ...rows.map((r) => r.el)), moreAhead);

  function render(m: { ground: SectionState[] }, frontierWord = words.frontier) {
    const line = frontier(m.ground);
    let farHeld = 0;
    let farAhead = 0;
    rows.forEach((r, i) => {
      const s = m.ground[i]!;
      const kind: SectorState = s.secured ? (s.control < 1 ? 'contested' : 'secured') : i === line ? 'frontier' : 'lost';
      // Near: anything slipping, the last section held, the push itself and the one after it.
      const near = kind === 'contested' || i === line - 1 || i === line || i === line + 1;
      setAttr(r.el, 'data-far', String(!near));
      if (!near && i < line) farHeld += 1;
      if (!near && i > line) farAhead += 1;
      setAttr(r.el, 'data-state', kind);
      r.fill.style.width = `${Math.round(s.control * 100)}%`;
      const word = kind === 'frontier' ? frontierWord : words[kind];
      setText(r.state, kind === 'lost' ? (i > line ? '' : words.lost) : `${word} ${Math.floor(s.control * 100)}%`);
    });
    setText(moreHeld, farHeld > 0 ? `${farHeld} MORE ${words.secured}` : '');
    moreHeld.hidden = farHeld === 0;
    setText(moreAhead, farAhead > 0 ? `${farAhead} MORE ${words.lost}` : '');
    moreAhead.hidden = farAhead === 0;
  }

  return { el, render };
}
