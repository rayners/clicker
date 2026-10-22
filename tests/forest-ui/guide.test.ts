// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createForestGame } from '../../src/forest/game';
import { createForestStore } from '../../src/forest/store';
import { mountForest } from '../../src/forest-ui/app';

function setup() {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  mountForest(document.getElementById('app')!, createForestStore(createForestGame(1, 0)));
  return userEvent.setup();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the walkthrough in Elderdark', () => {
  it('starts a new Factor on foraging, pointing at the button', () => {
    setup();
    expect(within(screen.getByRole('region', { name: /guide/i })).getByText('FORAGE')).toBeTruthy();
    expect(screen.getByRole('button', { name: /forage the eaves/i }).classList.contains('guide-target')).toBe(true);
  });

  it('keeps the charter\'s rules a tap away', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how the charter works/i })).toBeTruthy();
  });
});
