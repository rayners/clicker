import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import type { Store } from '../core/store';
import { COLONIST_WAVES, WAVE_HABITABILITY } from '../data/terraform/systems';
import { canThaw, habitability, wavesReady } from '../mission/terraform/economy';
import type { TerraformMission } from '../mission/state';

/** The colony: how livable Merrow is, who is down there, and the next wave waiting in the pods. */
export function createColony(store: Store): { el: HTMLElement; render(m: TerraformMission): void } {
  const hab = h('span', { class: 'colony-hab', 'aria-label': 'Habitability' });
  const people = h('span', { class: 'colony-people' });
  const thaw = h('button', { class: 'colony-thaw', type: 'button' });
  const note = h('span', { class: 'colony-note' });
  thaw.addEventListener('click', () => store.dispatch({ type: 'thawWave' }));
  const el = h(
    'section',
    { class: 'colony', 'aria-label': 'Colony' },
    h('div', { class: 'colony-head' }, h('span', { class: 'colony-label' }, 'COLONY · HABITABLE '), hab, people),
    h('div', { class: 'colony-foot' }, thaw, note),
  );

  function render(m: TerraformMission) {
    const h01 = habitability(m);
    setText(hab, `${Math.round(h01 * 100)}%`);
    // Red is for people dying, not for an empty surface.
    el.dataset.health = m.colonists === 0 ? 'empty' : h01 < 0.4 ? 'dying' : h01 < 0.6 ? 'poor' : 'good';
    setText(people, ` · ${formatNumber(m.colonists)} ALIVE · ${formatNumber(m.colonistsLost)} LOST`);
    const next = m.wavesThawed;
    const ready = next < wavesReady(m);
    thaw.hidden = !ready;
    if (ready) {
      setText(thaw, `THAW WAVE ${next + 1}`);
      setAttr(thaw, 'aria-label', `Thaw wave ${next + 1}`);
      thaw.disabled = !canThaw(m);
    }
    if (next >= COLONIST_WAVES.length) setText(note, 'ALL WAVES THAWED. THE TRANSPORT IS EMPTY.');
    else if (ready) setText(note, canThaw(m) ? 'PODS READY TO OPEN.' : `NEEDS ${Math.round(WAVE_HABITABILITY[next]! * 100)}% HABITABLE.`);
    else setText(note, `WAVE ${next + 1} SLEEPS UNTIL MORE OF MERROW IS TERRAFORMED.`);
  }

  return { el, render };
}
