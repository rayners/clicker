import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import {
  containmentLevelCost,
  reinforceCost,
  rigCost,
  RIG_RATE,
  fundingMultiplier,
  strainRate,
  ventCost,
} from '../mission/organism/containment';
import { awakeCount } from '../mission/crew';
import type { OrganismMission as MissionState } from '../mission/state';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createTracker } from './tracker';
import { ORGANISM_PANEL } from '../data/organism/panel';
import { scenarioOf } from '../mission/registry';
import { interpolate } from '../engine/lexicon';

function row(name: string, desc: string, value: HTMLElement, foot: HTMLElement, button: HTMLButtonElement) {
  return h(
    'li',
    { class: 'sys-row' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, name), value),
    h('p', { class: 'sys-desc' }, desc),
    h('div', { class: 'sys-foot' }, foot, button),
  );
}

function actionButton(store: Store, type: 'buyRig' | 'reinforce' | 'buyContainmentLevel' | 'vent') {
  const b = h('button', { class: 'buy', type: 'button' });
  b.addEventListener('click', () => store.dispatch({ type }));
  return b;
}

export function createProjectsPanel(store: Store): { el: HTMLElement; render(m: MissionState): void } {
  const specimens = h('span', { class: 'sys-owned', 'aria-label': 'Specimens held' });
  const funding = h('span', { class: 'sys-rate' });
  const rigs = h('span', { class: 'sys-owned', 'aria-label': 'Recovery rigs' });
  const rigRate = h('span', { class: 'sys-rate' });
  const rigButton = actionButton(store, 'buyRig');
  const rigDesc = h('p', { class: 'sys-desc' });
  const integrity = h('div', {
    class: 'pj-meter',
    role: 'meter',
    'aria-label': 'Containment integrity',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
  });
  const strain = h('span', { class: 'sys-rate' });
  const reinforceButton = actionButton(store, 'reinforce');
  const level = h('span', { class: 'sys-owned', 'aria-label': 'Containment level' });
  const levelButton = actionButton(store, 'buyContainmentLevel');
  const tracker = createTracker();
  const contacts = h('span', { class: 'sys-owned pj-contacts', 'aria-label': 'Contacts aboard' });
  const ventWarning = h('span', { class: 'sys-rate pj-warning' });
  const ventButton = actionButton(store, 'vent');
  const ventRow = h(
    'li',
    { class: 'sys-row pj-vent' },
    h('div', { class: 'sys-head' }, tracker.el, contacts),
    h('p', { class: 'sys-desc' }, 'Open the affected decks to vacuum. Not everything aboard will survive. Anyone awake may not either.'),
    h('div', { class: 'sys-foot' }, ventWarning, ventButton),
  );

  const el = h(
    'section',
    { class: 'panel panel-projects', role: 'tabpanel', id: 'panel-projects', 'aria-labelledby': 'tab-projects' },
    h('h2', { class: 'panel-title' }, 'SPECIAL PROJECTS'),
    h(
      'ul',
      { class: 'sys-list' },
      row('SPECIMENS IN CONTAINMENT', 'Special Projects funds every specimen held aboard. Do not open the containers.', specimens, funding, h('button', { class: 'buy', type: 'button', hidden: true })),
      h(
        'li',
        { class: 'sys-row' },
        h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, 'RECOVERY RIG'), rigs),
        rigDesc,
        h('div', { class: 'sys-foot' }, rigRate, rigButton),
      ),
      h(
        'li',
        { class: 'sys-row' },
        h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, 'CONTAINMENT INTEGRITY'), integrity),
        h('div', { class: 'sys-foot' }, strain, reinforceButton),
      ),
      row('CRYO-LOCK FIELD', 'Supercooled field around the containers. Slows whatever is testing the walls.', level, h('span'), levelButton),
      ventRow,
    ),
  );

  function render(m: MissionState) {
    setText(specimens, String(Math.floor(m.specimens)));
    setText(funding, `FUNDING x${fundingMultiplier(m).toFixed(2)}`);
    setText(rigDesc, interpolate(ORGANISM_PANEL.rig, scenarioOf(m).lexicon));
    setText(rigs, String(m.rigs));
    setText(rigRate, `${formatNumber(m.rigs * RIG_RATE * 60)} /MIN`);
    const rCost = rigCost(m);
    setText(rigButton, `COMMISSION ${formatNumber(rCost)} CR`);
    setAttr(rigButton, 'aria-label', `Commission recovery rig for ${formatNumber(rCost)} credits`);
    rigButton.disabled = m.credits < rCost;

    const integ = Math.max(0, Math.round(m.integrity));
    setAttr(integrity, 'aria-valuenow', String(integ));
    setAttr(el, 'data-integrity', integ < 30 ? 'critical' : integ < 60 ? 'low' : 'ok');
    setText(integrity, `${integ}%`);
    setText(strain, `-${strainRate(m).toFixed(2)}%/S`);
    const fCost = reinforceCost(m);
    setText(reinforceButton, `REINFORCE ${formatNumber(fCost)} CR`);
    setAttr(reinforceButton, 'aria-label', `Reinforce containment for ${formatNumber(fCost)} credits`);
    reinforceButton.disabled = m.credits < fCost || m.integrity >= 100;

    setText(level, `LV ${m.containmentLevel}`);
    const lCost = containmentLevelCost(m);
    setText(levelButton, `UPGRADE ${formatNumber(lCost)} CR`);
    setAttr(levelButton, 'aria-label', `Upgrade containment for ${formatNumber(lCost)} credits`);
    levelButton.disabled = m.credits < lCost;

    const tracking = m.flags.includes('tracker');
    ventRow.hidden = !tracking;
    if (tracking) {
      tracker.render(m.contacts, m.elapsed, getComputedStyle(el).getPropertyValue('--danger').trim() || '#ff4a3d');
      setText(contacts, `${m.contacts} CONTACTS`);
      const awake = awakeCount(m);
      setText(ventWarning, awake > 0 ? `${awake} CREW AWAKE ON AFFECTED DECKS` : 'NO CREW ON AFFECTED DECKS');
      const vCost = ventCost(m);
      ventButton.hidden = m.contacts === 0;
      setText(ventButton, `VENT ${formatNumber(vCost)} CR`);
      setAttr(ventButton, 'aria-label', `Vent decks for ${formatNumber(vCost)} credits`);
      ventButton.disabled = m.credits < vCost;
    }
  }

  return { el, render };
}
