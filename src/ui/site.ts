import type { SectionState } from '../shared/ground';
import { frontier } from '../shared/ground';
import { h, setAttr, setText } from '../shared/ui/dom';

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
  const el = h('section', { class: 'site', 'aria-label': spec.label }, h('ol', { class: 'site-list' }, ...rows.map((r) => r.el)));

  function render(m: { ground: SectionState[] }, frontierWord = words.frontier) {
    const line = frontier(m.ground);
    rows.forEach((r, i) => {
      const s = m.ground[i]!;
      const kind: SectorState = s.secured ? (s.control < 1 ? 'contested' : 'secured') : i === line ? 'frontier' : 'lost';
      setAttr(r.el, 'data-state', kind);
      r.fill.style.width = `${Math.round(s.control * 100)}%`;
      const word = kind === 'frontier' ? frontierWord : words[kind];
      setText(r.state, kind === 'lost' ? (i > line ? '' : words.lost) : `${word} ${Math.floor(s.control * 100)}%`);
    });
  }

  return { el, render };
}
