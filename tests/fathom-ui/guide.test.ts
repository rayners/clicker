// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createFathomGame } from '../../src/fathom/game';
import { createFathomStore } from '../../src/fathom/store';
import { mountFathom } from '../../src/fathom-ui/app';
import { fathomGuideSteps } from '../../src/fathom-data/guide';
import type { Outfit } from '../../src/fathom/state';

function setup(patch: Partial<Outfit> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  const g = createFathomGame(1, 0);
  mountFathom(document.getElementById('app')!, createFathomStore({ ...g, outfit: { ...g.outfit, ...patch } }));
  return userEvent.setup();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the walkthrough in DOWN THERE', () => {
  it('greets a new season with its first lever, pointing at the beach pass', () => {
    setup();
    const tip = within(screen.getByRole('region', { name: /guide/i }));
    expect(tip.getByText('SELL A BEACH PASS')).toBeTruthy();
    expect(screen.getByRole('button', { name: /sell a beach pass/i }).classList.contains('guide-target')).toBe(true);
  });

  it('moves on once the player sells a pass', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /sell a beach pass/i }));
    expect(screen.queryByRole('region', { name: /guide/i })?.textContent ?? '').not.toMatch(/^SELL A BEACH PASS/);
  });

  it('points every step at a control that is really on screen once every zone is open', () => {
    setup({ lifetimeCash: 1e13, flags: ['breach'], pilots: 2, temperaments: [0.5, 0.5] });
    const g = createFathomGame(1, 0);
    for (const s of fathomGuideSteps(g)) if (s.target) expect(document.querySelector(s.target), s.id).not.toBeNull();
  });

  it('keeps the season rules one tap away in the masthead', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how the season works/i })).toBeTruthy();
  });
});
