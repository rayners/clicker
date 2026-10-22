// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createLateGame } from '../../src/late-fees/game';
import { createLateStore } from '../../src/late-fees/store';
import { mountLate } from '../../src/late-fees-ui/app';

function setup() {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  mountLate(document.getElementById('app')!, createLateStore(createLateGame(1, 0)));
  return userEvent.setup();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the walkthrough in LATE FEES', () => {
  it('greets a new film with its first lever, pointing at the whistle', () => {
    setup();
    const tip = within(screen.getByRole('region', { name: /guide/i }));
    expect(tip.getByText('BLOW THE WHISTLE')).toBeTruthy();
    expect(screen.getByRole('button', { name: /blow the whistle/i }).classList.contains('guide-target')).toBe(true);
  });

  it('moves on once the player blows the whistle', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /blow the whistle/i }));
    expect(screen.queryByRole('region', { name: /guide/i })?.textContent ?? '').not.toMatch(/^BLOW THE WHISTLE/);
  });

  it('keeps the tape rules one tap away on the screen header', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how camp blackwater works/i })).toBeTruthy();
  });
});
