// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileGame } from '../../src/engine/data/game';
import { createDataPlay, type DataState, type DataStateAction } from '../../src/engine/data/play';
import { mountDataGame } from '../../src/engine/data/screen';
import { createReducerStore, type Store } from '../../src/engine/store';
import type { DataRun } from '../../src/engine/data/game';
import { confirmPause } from '../helpers';

const def = JSON.parse(readFileSync(resolve(__dirname, '../../games/clip-works.json'), 'utf8'));
const game = compileGame(def);
const play = createDataPlay(game);
let store: Store<DataState, DataStateAction>;

function setup(run: Partial<DataRun> = {}, amounts: Record<string, number> = {}) {
  localStorage.clear();
  document.body.replaceChildren();
  const root = document.createElement('div');
  document.body.append(root);
  const fresh = play.fresh(1, 0);
  store = createReducerStore<DataState, DataStateAction>({ ...fresh, run: { ...fresh.run, ...run, amounts: { ...fresh.run.amounts, ...amounts } } }, play.reduce);
  mountDataGame(root, game, store, play);
  return { root, user: userEvent.setup() };
}
const run = () => store.getState().run;
const tab = (name: RegExp) => screen.getByRole('tab', { name });

beforeEach(() => document.body.replaceChildren());

describe('a game made of data, on screen', () => {
  it('has the game\'s title and its big button, which presses', async () => {
    const { user } = setup();
    expect(screen.getByRole('heading', { name: 'CLIP WORKS', level: 1 })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Make a paperclip' }));
    expect(run().amounts.made).toBe(1);
  });

  it('headlines the supply, the market and its income, and steps the price', async () => {
    const { user } = setup({}, { wire: 0 });
    const flow = within(screen.getByRole('region', { name: 'Production flow' }));
    expect(flow.getByLabelText('WIRE').textContent).toBe('0');
    await user.click(screen.getByRole('button', { name: 'Raise the price' }));
    expect(run().price).toBeCloseTo(0.06);
    expect(screen.getByLabelText('Price').textContent).toBe('$0.06');
  });

  it('shows the money and the lifetime counts', () => {
    setup({}, { funds: 12, made: 40 });
    expect(screen.getByLabelText('FUNDS').textContent).toBe('$12');
    expect(screen.getByLabelText('MADE').textContent).toBe('40');
  });

  it('buys supply and items from its buy tab', async () => {
    const { user } = setup({}, { funds: 1000 });
    await user.click(tab(/^buy$/i));
    await user.click(screen.getByRole('button', { name: /buy wire for/i }));
    await user.click(screen.getByRole('button', { name: /buy autoclipper/i }));
    expect(run().amounts.wire).toBe(2000);
    expect(run().owned.autoclipper).toBe(1);
  });

  it('shows upgrades once there are some, marking the tab when one can be afforded', async () => {
    const { user } = setup({}, { made: 300, funds: 100 });
    await user.click(tab(/upgrades \(active\)/i));
    await user.click(screen.getByRole('button', { name: /buy sharper dies/i }));
    expect(run().upgrades).toEqual(['sharper-dies']);
  });

  it('offers its endings at the end, each taken with a second tap', async () => {
    const { user } = setup({ flags: ['terminus'] }, { made: 1e6 });
    await user.click(tab(/the end/i));
    const sell = within(screen.getByRole('region', { name: 'SELL THE WORKS' }));
    await user.click(sell.getByRole('button'));
    await confirmPause();
    await user.click(sell.getByRole('button', { name: /confirm/i }));
    expect(run().carried.goodwill).toBe(1);
  });

  it('starts its walkthrough at the big button, and keeps settings a tap away with no sound switch', async () => {
    const { user } = setup();
    expect(within(screen.getByRole('region', { name: /guide/i })).getByText('MAKE A CLIP')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(within(screen.getByRole('dialog', { name: 'Settings' })).queryByRole('checkbox', { name: /sound/i })).toBeNull();
  });

  it('wears its theme: colours from the definition as tokens on the page', () => {
    const { root } = setup();
    expect(root.style.getPropertyValue('--theme-accent')).toBe('#2f5d8a');
  });
});
