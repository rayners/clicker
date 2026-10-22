// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, newGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { veteran } from '../helpers';

let store: Store;

function setup(game: GameState) {
  document.body.innerHTML = '<div id="app"></div>';
  store = createStore(game);
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const dialog = () => screen.queryByRole('dialog', { name: /contract assignment/i });

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('assignment screen', () => {
  it('greets a new player with the one contract on offer, and shows what unlocks the rest', () => {
    setup(newGame(1, 0));
    const d = within(dialog()!);
    expect(d.getByRole('button', { name: /accept overland contract/i })).toBeTruthy();
    expect(d.queryByRole('button', { name: /accept extraction contract/i })).toBeNull();
    expect(within(d.getByRole('region', { name: /salvage/i })).getByText(/UNLOCKS AFTER 4 CONTRACTS/)).toBeTruthy();
    expect(within(d.getByRole('region', { name: /mineral extraction/i })).getByText(/UNLOCKS AFTER 1 CONTRACT$/)).toBeTruthy();
    expect(d.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('starts the chosen contract and gets out of the way', async () => {
    const user = setup(veteran(newGame(1, 0)));
    await user.click(within(dialog()!).getByRole('button', { name: /accept terraforming contract/i }));
    expect(store.getState().mission.scenario).toBe('terraform');
    expect(dialog()).toBeNull();
    expect(screen.getByRole('button', { name: /fire processor surge/i })).toBeTruthy();
  });

  it('can be reached mid-contract from CFG with a confirming second tap, and cancelled', async () => {
    const user = setup(createGame(1, 0));
    expect(dialog()).toBeNull();
    await user.click(screen.getByRole('button', { name: /system configuration/i }));
    const request = screen.getByRole('button', { name: /request reassignment/i });
    await user.click(request);
    expect(store.getState().assigning).toBe(false);
    await user.click(request);
    expect(store.getState().assigning).toBe('reassign');
    await user.click(within(dialog()!).getByRole('button', { name: /cancel/i }));
    expect(dialog()).toBeNull();
    expect(store.getState().mission.scenario).toBe('extraction');
  });

  it('warns that abandoning a contract earns nothing', async () => {
    const user = setup({ ...createGame(1, 0), assigning: 'reassign' });
    expect(within(dialog()!).getByText(/abandon/i)).toBeTruthy();
    void user;
  });
});
