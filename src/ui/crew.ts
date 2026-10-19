import { formatNumber } from '../core/format';
import type { Store } from '../core/store';
import { CREW } from '../data/crew';
import { awakeCount, crewStatus, MAX_AWAKE } from '../mission/crew';
import type { MissionState } from '../mission/state';
import { h, setAttr, setText } from './dom';

const BAR_CELLS = 10;

function bar(fatigue: number): string {
  const filled = Math.round((fatigue / 100) * BAR_CELLS);
  return '[' + '#'.repeat(filled) + '.'.repeat(BAR_CELLS - filled) + ']';
}

export function createCrewPanel(store: Store): { el: HTMLElement; render(m: MissionState): void } {
  const lifeSupport = h('p', { class: 'crew-life' });
  const cards = CREW.map((def) => {
    const status = h('span', { class: 'crew-status' });
    const meter = h('div', {
      class: 'crew-meter',
      role: 'meter',
      'aria-label': 'Fatigue',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
    });
    const button = h('button', { class: 'buy', type: 'button' });
    button.addEventListener('click', () => {
      const awake = store.getState().mission.crew[def.id]?.status === 'awake';
      store.dispatch({ type: awake ? 'sleepCrew' : 'wakeCrew', id: def.id });
    });
    const portrait = h('canvas', { class: 'crew-portrait', width: 16, height: 16, 'data-sprite': `crew-${def.id}`, 'aria-hidden': 'true' });
    const el = h(
      'article',
      { class: 'crew-card', 'aria-label': def.name, 'data-crew': def.id },
      h(
        'div',
        { class: 'crew-head' },
        portrait,
        h('div', { class: 'crew-id' }, h('span', { class: 'crew-name' }, def.name), h('span', { class: 'crew-role' }, def.role)),
        status,
      ),
      h('p', { class: 'sys-desc' }, def.dossier),
      h('div', { class: 'crew-boost' }, `> ${def.boostText}`),
      h('div', { class: 'sys-foot' }, h('span', { class: 'crew-fatigue' }, 'FATIGUE ', meter), button),
    );
    return { def, el, status, meter, button };
  });

  const el = h(
    'section',
    { class: 'panel panel-crew', role: 'tabpanel', id: 'panel-crew', 'aria-labelledby': 'tab-crew' },
    h('h2', { class: 'panel-title' }, 'CRYO BAY'),
    lifeSupport,
    h('div', { class: 'crew-list' }, ...cards.map((c) => c.el)),
  );

  function render(m: MissionState) {
    const awake = awakeCount(m);
    setText(lifeSupport, `AWAKE ${awake}/${MAX_AWAKE}`);
    for (const card of cards) {
      const state = m.crew[card.def.id];
      if (!state) continue;
      const status = crewStatus(m, card.def.id);
      setText(card.status, status.toUpperCase());
      setAttr(card.el, 'data-status', status);
      const fatigue = Math.round(state.fatigue);
      setAttr(card.meter, 'aria-valuenow', String(fatigue));
      setText(card.meter, bar(state.fatigue));
      if (state.status === 'awake') {
        setText(card.button, 'TO CRYO');
        setAttr(card.button, 'aria-label', `Return ${card.def.name} to cryo`);
        card.button.disabled = false;
      } else {
        setText(card.button, `WAKE ${formatNumber(card.def.thawCost)} CR`);
        setAttr(card.button, 'aria-label', `Wake ${card.def.name} for ${formatNumber(card.def.thawCost)} credits`);
        card.button.disabled = m.credits < card.def.thawCost || awake >= MAX_AWAKE;
      }
    }
  }

  return { el, render };
}
