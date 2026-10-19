// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';

let store: Store;

function setup(mission: Partial<GameState['mission']> = {}, profile: Partial<GameState['profile']> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, profile: { ...g.profile, ...profile }, mission: { ...g.mission, ...mission } });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const tab = (name: RegExp) => screen.queryByRole('tab', { name });
const terminus = { act: 4, flags: ['terminus'], specimens: 10, lifetimeOre: 1e10 };

describe('terminus panel', () => {
  it('is hidden until the return window opens', () => {
    setup();
    expect(tab(/terminus/i)).toBeNull();
  });

  it('presents each ending with what it will earn', async () => {
    const user = setup(terminus);
    await user.click(tab(/terminus/i)!);
    const deliver = screen.getByRole('region', { name: /deliver the cargo/i });
    expect(within(deliver).getByText(/\+3 SENIORITY/)).toBeTruthy();
    const scuttle = screen.getByRole('region', { name: /scuttle/i });
    expect(within(scuttle).getByText(/\+8 CONSCIENCE/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: /broadcast/i })).toBeNull();
  });

  it('asks for confirmation, then ends the contract and starts the next', async () => {
    const user = setup(terminus);
    await user.click(tab(/terminus/i)!);
    const button = within(screen.getByRole('region', { name: /deliver the cargo/i })).getByRole('button');
    await user.click(button);
    expect(store.getState().profile.contractsCompleted).toBe(0);
    expect(button.textContent).toMatch(/confirm/i);
    await user.click(button);
    expect(store.getState().profile.contractsCompleted).toBe(1);
    expect(store.getState().mission.act).toBe(1);
    expect(tab(/terminus/i)).toBeNull();
    const ship = store.getState().mission.config.shipName.toUpperCase();
    expect(within(screen.getByRole('banner')).getByText(ship)).toBeTruthy();
    // The comms log starts over with the new vessel's boot sequence.
    const log = within(screen.getByRole('log'));
    expect(log.getByText(new RegExp(`VESSEL: ${ship}`))).toBeTruthy();
    expect(log.queryByText(/VESSEL: MSV CALLOWAY REACH/)).toBeNull();
  });

  it('offers the broadcast when it is available', async () => {
    const user = setup(terminus, { contractsCompleted: 3, conscience: 4 });
    await user.click(tab(/terminus/i)!);
    expect(screen.getByRole('region', { name: /broadcast/i })).toBeTruthy();
  });
});

describe('contract record', () => {
  it('lists previous contracts and carried-over standing in the archive', async () => {
    const user = setup(
      {},
      {
        contractsCompleted: 1,
        seniority: 3,
        conscience: 0,
        history: [{ shipName: 'MSV Calloway Reach', ending: 'deliver', lifetimeOre: 1e10, specimens: 10, crewSurvived: 2, duration: 9000 }],
      },
    );
    await user.click(tab(/archive/i)!);
    const record = screen.getByRole('list', { name: /contract record/i });
    expect(within(record).getByText(/MSV CALLOWAY REACH/)).toBeTruthy();
    expect(within(record).getByText(/DELIVERED/)).toBeTruthy();
    expect(screen.getByText(/SENIORITY 3/)).toBeTruthy();
  });
});
