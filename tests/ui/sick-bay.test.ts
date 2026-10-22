// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState, type OutbreakMission } from '../../src/mission/state';

let store: Store;

function setup(patch: Partial<OutbreakMission> = {}) {
  localStorage.clear();
  localStorage.setItem('deep-contract.guide', JSON.stringify({ seen: [], skipped: true }));
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  const mission = { ...createMission({ ...DEFAULT_MISSION_CONFIG, horror: 'outbreak' }, 1), credits: 1e12, ...patch } as MissionState;
  store = createStore({ ...g, mission } as GameState);
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}
const m = () => store.getState().mission as OutbreakMission;
const tab = () => screen.queryByRole('tab', { name: /sick bay/i });
const panel = () => within(screen.getByRole('tabpanel', { name: /sick bay/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the SICK BAY on screen', () => {
  it('stays hidden in act one, and opens in act two as a routine wellness panel', async () => {
    setup();
    expect(tab()).toBeNull();
    const user = setup({ act: 2, sick: 0.04 });
    await user.click(tab()!);
    expect(panel().getByLabelText('Staff off sick').textContent).toBe('4%');
    expect(panel().queryByRole('group', { name: /quarantine/i })).toBeNull();
    await user.click(panel().getByRole('button', { name: /fund the wellness programme/i }));
    expect(m().wellness).toBe(1);
  });

  it('adds the quarantine dial, screening, wards and the officer after the discovery', async () => {
    const user = setup({ act: 3, flags: ['outbreak'] });
    await user.click(tab()!);
    await user.click(panel().getByRole('button', { name: /isolate more/i }));
    expect(m().quarantine).toBe(1);
    expect(panel().getByLabelText('Quarantine').textContent).toBe('10%');
    await user.click(panel().getByRole('button', { name: /^buy screening/i }));
    expect(m().screening).toBe(1);
    await user.click(panel().getByRole('button', { name: /^add a ward bed/i }));
    expect(m().wards).toBe(1);
    await user.click(panel().getByRole('button', { name: /^hire an infection control officer/i }));
    expect(m().officer).toBe(true);
    expect(panel().getByText(/OFFICER HAS THE DIAL/)).toBeTruthy();
  });

  it('shows the exposed only once screening can find them', async () => {
    const user = setup({ act: 3, flags: ['outbreak'], exposed: 0.07 });
    await user.click(tab()!);
    expect(panel().getByLabelText('Infected, not yet showing').hidden).toBe(true);
    await user.click(panel().getByRole('button', { name: /^buy screening/i }));
    expect(panel().getByLabelText('Infected, not yet showing').textContent).toBe('7%');
  });

  it('offers culture tanks once Bioproducts asks, with the samples they have grown', async () => {
    const user = setup({ act: 3, flags: ['outbreak', 'cultures'], samples: 4 });
    await user.click(tab()!);
    expect(panel().getByLabelText('Samples held').textContent).toBe('4');
    await user.click(panel().getByRole('button', { name: /^build a culture tank/i }));
    expect(m().cultures).toBe(1);
  });

  it('shows the turned in act four, marks the tab, and seals a section on lockdown', async () => {
    const user = setup({ act: 4, flags: ['outbreak'], turned: 0.2 });
    expect(tab()!.dataset.attention).toBe('alert');
    expect(screen.getByLabelText('Turned').textContent).toBe('20%');
    await user.click(tab()!);
    await user.click(panel().getByRole('button', { name: /^lock down a section/i }));
    expect(m().lockdowns).toBe(1);
  });
});
