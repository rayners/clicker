import { SECTIONS } from '../data/security/systems';
import type { SecurityMission } from '../mission/state';
import { frontier } from '../shared/ground';
import { h, setAttr, setText } from '../shared/ui/dom';

type SectorState = 'secured' | 'contested' | 'frontier' | 'lost';

/** The colony as a column of sectors from the landing pad down: what is held, what is slipping, where the fight is. */
export function createSite(): { el: HTMLElement; render(m: SecurityMission): void } {
  const rows = SECTIONS.map((def) => {
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
  const el = h('section', { class: 'site', 'aria-label': 'Colony sectors' }, h('ol', { class: 'site-list' }, ...rows.map((r) => r.el)));

  function render(m: SecurityMission) {
    const line = frontier(m.ground);
    rows.forEach((r, i) => {
      const s = m.ground[i]!;
      const kind: SectorState = s.secured ? (s.control < 1 ? 'contested' : 'secured') : i === line ? 'frontier' : 'lost';
      setAttr(r.el, 'data-state', kind);
      r.fill.style.width = `${Math.round(s.control * 100)}%`;
      setText(r.state, kind === 'lost' ? (i > line ? '' : 'LOST') : `${kind.toUpperCase()} ${Math.floor(s.control * 100)}%`);
    });
  }

  return { el, render };
}
