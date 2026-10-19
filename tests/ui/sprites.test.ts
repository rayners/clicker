// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { SPRITES } from '../../src/data/sprites';

function setup() {
  document.body.innerHTML = '<div id="app"></div>';
  mountApp(document.getElementById('app')!, createStore(createGame(1, 0)));
}

describe('pixel accents', () => {
  it('puts the ship in the masthead', () => {
    setup();
    const canvas = within(screen.getByRole('banner')).getByTestId('sprite-ship') as HTMLCanvasElement;
    expect(canvas.width).toBe(SPRITES.ship!.width);
    expect(canvas.height).toBe(SPRITES.ship!.height);
  });

  it('puts an animated drill bit in the drill button that advances a frame on each cycle', async () => {
    setup();
    const button = screen.getByRole('button', { name: /execute drill cycle/i });
    const canvas = within(button).getByTestId('sprite-drill');
    expect(canvas.dataset.frame).toBe('0');
    await userEvent.setup().click(button);
    expect(canvas.dataset.frame).toBe('1');
  });

  it('shows the target moonlet in the status area', () => {
    setup();
    expect(within(screen.getByRole('region', { name: /ship status/i })).getByTestId('sprite-moonlet')).toBeTruthy();
  });
});
