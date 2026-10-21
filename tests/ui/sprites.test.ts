// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { SPRITES } from '../../src/data/sprites';
import { createMission, HAULAGE_MISSION_CONFIG, OVERLAND_MISSION_CONFIG, type MissionConfig } from '../../src/mission/state';
import type { Store } from '../../src/core/store';

function contract(config: MissionConfig): Store {
  document.body.innerHTML = '<div id="app"></div>';
  const store = createStore({ ...createGame(1, 0), mission: createMission(config, 1) });
  mountApp(document.getElementById('app')!, store);
  return store;
}

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

  it('shows the crawler rig, the lift on its planet, and an engine that turns over on the road', async () => {
    contract(OVERLAND_MISSION_CONFIG);
    const rig = within(screen.getByRole('banner')).getByTestId('sprite-crawler') as HTMLCanvasElement;
    expect(rig.width).toBe(SPRITES.crawler!.width);
    expect(within(screen.getByRole('region', { name: /ship status/i })).getByTestId('sprite-lift')).toBeTruthy();
    const button = screen.getByRole('button', { name: /gun the engine/i });
    const engine = within(button).getByTestId('sprite-piston');
    await userEvent.setup().click(button);
    expect(engine.dataset.frame).toBe('1');
    expect(screen.queryByTestId('sprite-ship')).toBeNull();
  });

  it('shows the tug and its train, a station, and a thruster on the long haul', () => {
    contract(HAULAGE_MISSION_CONFIG);
    expect(within(screen.getByRole('banner')).getByTestId('sprite-tug')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: /ship status/i })).getByTestId('sprite-station')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: /fire thrusters/i })).getByTestId('sprite-thruster')).toBeTruthy();
  });

  it('goes back to the ship and the drill when the next contract is a mining one', () => {
    const store = contract(OVERLAND_MISSION_CONFIG);
    store.replace({ ...store.getState(), mission: createMission({ ...OVERLAND_MISSION_CONFIG, scenario: 'extraction', horror: 'organism' }, 2) });
    expect(within(screen.getByRole('banner')).getByTestId('sprite-ship')).toBeTruthy();
    expect(screen.queryByTestId('sprite-crawler')).toBeNull();
  });
});
