// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createClipsGame, createClipsStore, type ClipsGame, type ClipsStore } from '../../src/clips/game';
import type { Works } from '../../src/clips/works';
import { mountClips } from '../../src/clips-ui/app';
import { confirmPause } from '../helpers';

let store: ClipsStore;

function setup(works: Partial<Works> = {}) {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  const g = createClipsGame(1, 0);
  store = createClipsStore({ ...g, works: { ...g.works, ...works } } as ClipsGame);
  mountClips(document.getElementById('app')!, store);
  return userEvent.setup();
}
const works = () => store.getState().works;
const tab = (name: RegExp) => screen.getByRole('tab', { name });

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('CLIP WORKS on screen', () => {
  it('makes a clip with the big button', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Make a paperclip' }));
    expect(works().made).toBe(1);
  });

  it('headlines wire, clips and funds, and what is holding the works back', () => {
    setup({ wire: 0, unsold: 3 });
    const flow = within(screen.getByRole('region', { name: 'Production flow' }));
    expect(flow.getByLabelText('Wire').textContent).toBe('0');
    expect(screen.getByText(/OUT OF WIRE/)).toBeTruthy();
  });

  it('sets the price a cent at a time', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Raise the price' }));
    expect(works().price).toBeCloseTo(0.06);
    expect(screen.getByLabelText('Price per clip').textContent).toBe('$0.06');
  });

  it('buys wire, autoclippers and marketing from the works', async () => {
    const user = setup({ funds: 1_000 });
    await user.click(tab(/works/i));
    await user.click(screen.getByRole('button', { name: /buy a spool of wire/i }));
    await user.click(screen.getByRole('button', { name: /buy autoclipper/i }));
    await user.click(screen.getByRole('button', { name: /buy marketing/i }));
    expect(works().wire).toBe(2_000);
    expect(works().autoclippers).toBe(1);
    expect(works().marketing).toBe(1);
  });

  it('shows upgrades once there are some, and marks the tab when one can be afforded', async () => {
    const user = setup({ made: 300, funds: 100 });
    expect(tab(/upgrades \(active\)/i)).toBeTruthy();
    await user.click(tab(/upgrades/i));
    await user.click(screen.getByRole('button', { name: /buy sharper dies/i }));
    expect(works().upgrades).toEqual(['sharper-dies']);
  });

  it('offers its endings at a million clips, each ended by a second tap', async () => {
    const user = setup({ made: 1e6, flags: ['terminus'] });
    await user.click(tab(/the million/i));
    const sell = within(screen.getByRole('region', { name: /sell the works/i }));
    await user.click(sell.getByRole('button'));
    await confirmPause();
    await user.click(sell.getByRole('button', { name: /confirm/i }));
    expect(store.getState().profile.goodwill).toBe(1);
  });

  it('keeps settings a tap away, with no sound switch in a game with no sound', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Settings' }));
    expect(dialog.queryByRole('checkbox', { name: /sound/i })).toBeNull();
    expect(dialog.getByRole('button', { name: /export/i })).toBeTruthy();
  });

  it('has a walkthrough that starts at the big button', () => {
    setup();
    expect(within(screen.getByRole('region', { name: /guide/i })).getByText('MAKE A CLIP')).toBeTruthy();
  });
});
