// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';

let store: Store;
function setup() {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  store = createStore(createGame(1, 0));
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the walkthrough in DEEP CONTRACT', () => {
  it('greets a new contract with its first lever, pointing at the button', () => {
    setup();
    const tip = within(screen.getByRole('region', { name: /guide/i }));
    expect(tip.getByText('DRILL')).toBeTruthy();
    expect(screen.getByRole('button', { name: /execute drill cycle/i }).classList.contains('guide-target')).toBe(true);
  });

  it('moves on once the player drills', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /execute drill cycle/i }));
    expect(screen.queryByRole('region', { name: /guide/i })?.textContent ?? '').not.toMatch(/^DRILL/);
    expect(screen.getByRole('button', { name: /execute drill cycle/i }).classList.contains('guide-target')).toBe(false);
  });

  it('keeps the contract rules one tap away in the masthead', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how extraction works/i })).toBeTruthy();
  });
});
