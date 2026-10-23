import { formatNumber } from '../engine/format';
import type { Action, Store } from '../core/store';
import { cultureCost, lockdownCost, OFFICER_COST, screeningCost, wardCost, wellnessCost } from '../mission/outbreak/levers';
import { MAX_QUARANTINE, outbreakProduction } from '../mission/outbreak/spread';
import type { OutbreakMission } from '../mission/state';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createStepper } from '../engine/ui/stepper';

const pct = (share: number) => `${Math.round(share * 100)}%`;

function row(name: string, desc: string, value: HTMLElement, foot: HTMLElement, button?: HTMLButtonElement) {
  const el = h(
    'li',
    { class: 'sys-row' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, name), value),
    h('p', { class: 'sys-desc' }, desc),
    h('div', { class: 'sys-foot' }, foot, ...(button ? [button] : [])),
  );
  return el;
}

function buyButton(store: Store, action: Action) {
  const b = h('button', { class: 'buy', type: 'button' });
  b.addEventListener('click', () => store.dispatch(action));
  return b;
}

function price(b: HTMLButtonElement, text: string, aria: string, cost: number, credits: number) {
  setText(b, `${text} ${formatNumber(cost)} CR`);
  setAttr(b, 'aria-label', `${aria} for ${formatNumber(cost)} credits`);
  b.disabled = credits < cost;
}

/**
 * The SICK BAY (docs/OUTBREAK.md). In act II it is a routine wellness panel; the quarantine dial, screening, wards and
 * the officer arrive with the discovery, the culture tanks when Bioproducts asks, and lockdown once the turned are out.
 */
export function createSickBayPanel(store: Store): { el: HTMLElement; render(m: OutbreakMission): void } {
  const sick = h('span', { class: 'sys-owned', 'aria-label': 'Staff off sick' });
  const exposed = h('span', { class: 'sys-rate', 'aria-label': 'Infected, not yet showing' });
  const sickNote = h('span', { class: 'sys-rate' });
  const wellness = h('span', { class: 'sys-owned' });
  const wellnessButton = buyButton(store, { type: 'buyWellness' });

  const quarantine = createStepper({
    value: { aria: 'Quarantine' },
    less: { label: 'Isolate fewer', onPress: () => store.dispatch({ type: 'shiftQuarantine', step: -1 }) },
    more: { label: 'Isolate more', onPress: () => store.dispatch({ type: 'shiftQuarantine', step: 1 }) },
  });
  const output = h('span', { class: 'sys-rate' });
  const officerNote = h('p', { class: 'dial-auto' }, 'THE INFECTION CONTROL OFFICER HAS THE DIAL · TIGHT WHILE IT IS GOING ROUND');
  const dial = h(
    'li',
    { class: 'sys-row sb-dial', role: 'group', 'aria-label': 'Quarantine dial' },
    h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, 'QUARANTINE'), output),
    h('p', { class: 'sys-desc' }, 'Staff kept apart do not spread it, and do not work.'),
    quarantine.el,
    officerNote,
  );
  const screening = h('span', { class: 'sys-owned' });
  const screeningButton = buyButton(store, { type: 'buyScreening' });
  const wards = h('span', { class: 'sys-owned' });
  const wardButton = buyButton(store, { type: 'buyWard' });
  const officer = h('span', { class: 'sys-owned' });
  const officerButton = buyButton(store, { type: 'hireOfficer' });
  const samples = h('span', { class: 'sys-owned', 'aria-label': 'Samples held' });
  const funding = h('span', { class: 'sys-rate' });
  const cultureButton = buyButton(store, { type: 'buyCulture' });
  const turned = h('span', { class: 'sys-owned pj-contacts' });
  const lockdownNote = h('span', { class: 'sys-rate pj-warning' });
  const lockdownButton = buyButton(store, { type: 'lockdown' });

  const discovered = [
    dial,
    row('SCREENING', 'Swab everyone, every shift. Quarantine finds the right people.', screening, h('span'), screeningButton),
    row('WARD BEDS', 'A bed, a drip and a locked door. The sick on a ward bed stay sick.', wards, h('span'), wardButton),
    row('INFECTION CONTROL OFFICER', 'Someone whose whole job is the dial.', officer, h('span'), officerButton),
  ];
  const culturesRow = row('CULTURE TANKS', 'Bioproducts pays for every viable sample. The tanks make the strain stronger.', samples, funding, cultureButton);
  const lockdownRow = row('LOCKDOWN', 'Seal a section with whoever is inside it. Nobody on that side works for a while.', turned, lockdownNote, lockdownButton);

  const el = h(
    'section',
    { class: 'panel panel-sickbay', role: 'tabpanel', id: 'panel-sickbay', 'aria-labelledby': 'tab-sickbay' },
    h('h2', { class: 'panel-title' }, 'SICK BAY'),
    h(
      'ul',
      { class: 'sys-list' },
      row('STAFF OFF SICK', 'Signed off, in their bunks, or in the sick bay.', sick, h('span', {}, sickNote, exposed)),
      row('WELLNESS PROGRAMME', 'Vitamins, rest days and a poster about hand-washing. Staff get back on shift sooner.', wellness, h('span'), wellnessButton),
      ...discovered,
      culturesRow,
      lockdownRow,
    ),
  );

  function render(m: OutbreakMission) {
    setText(sick, pct(m.sick));
    exposed.hidden = m.screening === 0;
    setText(exposed, pct(m.exposed));
    setText(sickNote, m.screening > 0 ? 'NOT YET SHOWING: ' : '');
    setText(wellness, `LV ${m.wellness}`);
    price(wellnessButton, 'FUND', 'Fund the Wellness programme', wellnessCost(m), m.credits);

    const isDiscovered = m.act >= 3 && m.flags.includes('outbreak');
    for (const r of discovered) r.hidden = !isDiscovered;
    if (isDiscovered) {
      quarantine.render(`${Math.round((m.quarantine / MAX_QUARANTINE) * 100)}%`, { less: !m.officer, more: !m.officer });
      setText(output, `OUTPUT x${outbreakProduction(m).toFixed(2)}`);
      officerNote.hidden = !m.officer;
      setText(screening, `LV ${m.screening}`);
      price(screeningButton, 'BUY', 'Buy screening', screeningCost(m), m.credits);
      setText(wards, `${m.wards} BEDS`);
      price(wardButton, 'ADD', 'Add a ward bed', wardCost(m), m.credits);
      setText(officer, m.officer ? 'ON DUTY' : 'VACANT');
      officerButton.hidden = m.officer;
      price(officerButton, 'HIRE', 'Hire an Infection Control Officer', OFFICER_COST, m.credits);
    }

    culturesRow.hidden = !m.flags.includes('cultures');
    setText(samples, String(Math.floor(m.samples)));
    setText(funding, `${m.cultures} TANKS`);
    price(cultureButton, 'BUILD', 'Build a culture tank', cultureCost(m), m.credits);

    lockdownRow.hidden = m.act < 4;
    setText(turned, `${pct(m.turned)} TURNED`);
    setText(lockdownNote, m.lockdownFor > 0 ? `SEALED · ${Math.ceil(m.lockdownFor)}S` : '');
    price(lockdownButton, 'SEAL', 'Lock down a section', lockdownCost(m), m.credits);
    lockdownButton.disabled ||= m.turned <= 0;
  }

  return { el, render };
}
