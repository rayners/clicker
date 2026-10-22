// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { veteran } from '../helpers';
import { BOARDROOM_UNLOCK_CONTRACTS } from '../../src/core/prestige';
import { createBoardroom } from '../../src/core/boardroom';

let store: Store;

function setup(game: GameState) {
  localStorage.clear();
  localStorage.setItem('deep-contract.guide', JSON.stringify({ seen: [], skipped: true }));
  document.body.innerHTML = '<div id="app"></div>';
  store = createStore(game);
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}
const board = () => store.getState().boardroom!;
const view = () => within(screen.getByRole('region', { name: /the boardroom/i }));
const promoted = (patch: Partial<NonNullable<GameState['boardroom']>> = {}) => {
  const g = store.dispatch({ type: 'enterBoardroom', seed: 3 });
  void g;
  return patch;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the BOARDROOM on screen', () => {
  it('is offered from the configuration once promoted, and says what opens it before that', async () => {
    const user = setup(createGame(1, 0));
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    expect(screen.getByRole('button', { name: new RegExp(`BOARDROOM · AFTER ${BOARDROOM_UNLOCK_CONTRACTS} CONTRACTS`, 'i') })).toHaveProperty('disabled', true);
    document.body.innerHTML = '';
    const vet = setup(veteran(createGame(1, 0)));
    await vet.click(screen.getByRole('button', { name: /configuration/i }));
    await vet.click(screen.getByRole('button', { name: /accept promotion/i }));
    expect(store.getState().mode).toBe('boardroom');
    expect(screen.getByRole('region', { name: /the boardroom/i }).hidden).toBe(false);
  });

  it('charters a contract into an office, and shows it as a card', async () => {
    const user = setup(veteran(createGame(1, 0)));
    promoted();
    await user.click(view().getByRole('button', { name: /^charter extraction/i }));
    expect(board().contracts).toHaveLength(1);
    const card = view().getByRole('article', { name: board().contracts[0]!.mission.config.shipName });
    expect(within(card).getByText(/ACT 1/)).toBeTruthy();
    expect(within(card).getByText('0 YEARS OUT')).toBeTruthy();
    expect(view().getByText(/Q1 · YEAR 1/)).toBeTruthy();
    expect(view().getByRole('button', { name: /^charter terraform/i })).toHaveProperty('disabled', true);
  });

  it('turns the safety budget, flips the standing policy, buys a floor and a division', async () => {
    const user = setup({ ...veteran(createGame(1, 0)), mode: 'boardroom', boardroom: { ...createBoardroom(3), value: 1e9 } });
    await user.click(view().getByRole('button', { name: /raise the safety budget/i }));
    expect(board().safety).toBe(6);
    expect(view().getByLabelText('Safety budget').textContent).toBe('60%');
    await user.click(view().getByRole('button', { name: /standing policy/i }));
    expect(board().policy).toBe('scuttle');
    await user.click(view().getByRole('button', { name: /^buy a floor/i }));
    expect(board().slots).toBe(2);
    await user.click(view().getByRole('button', { name: /^fund legal/i }));
    expect(board().divisions.legal).toBe(1);
  });

  it('shows value, offices, scrutiny and the minutes, and returns to the contract', async () => {
    const user = setup(veteran(createGame(1, 0)));
    promoted();
    store.dispatch({ type: 'commission', scenario: 'extraction', seed: 2 });
    expect(view().getByLabelText('Offices').textContent).toBe('1 / 1');
    expect(view().getByLabelText('Scrutiny').textContent).toBe('0%');
    expect(view().getByRole('list', { name: /minutes/i })).toBeTruthy();
    await user.click(view().getByRole('button', { name: /return to the contract/i }));
    expect(store.getState().mode).toBe('mission');
  });

  it('offers the term\'s endings once it ends, each with a second tap to confirm', async () => {
    const user = setup({ ...veteran(createGame(1, 0)), mode: 'boardroom', boardroom: { ...createBoardroom(3), flags: ['term-end'] } });
    const ending = within(view().getByRole('region', { name: /end of term/i }));
    expect(ending.queryByRole('button', { name: /release the minutes/i })).toBeNull();
    await user.click(ending.getByRole('button', { name: /^chair the board/i }));
    expect(store.getState().profile.boardTerms).toBe(0);
    await user.click(ending.getByRole('button', { name: /confirm/i }));
    expect(store.getState().profile.dividends).toBe(1);
    expect(board().term).toBe(2);
    expect(view().queryByRole('region', { name: /end of term/i })).toBeNull();
  });
});
