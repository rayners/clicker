// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { createMission, OVERLAND_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { DEPOTS, RIG_ENGINES, TRAILERS } from '../../src/data/overland/systems';

type L = MissionOf<'overland', 'quiet'>;
let store: Store;
const blank = () => createMission(OVERLAND_MISSION_CONFIG, 1) as L;

function setup(patch: Partial<L> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  store = createStore({ ...createGame(1, 0), mission: { ...blank(), ...patch } });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}
const mission = () => store.getState().mission as L;
const helm = () => within(screen.getByRole('region', { name: /helm/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the overland haul on screen', () => {
  it('drives a crawler rig: gun the engine, throttle, depots by name', async () => {
    const user = setup({ engines: { ...blank().engines, bogie: 2 }, cars: { ...blank().cars, skip: 1 } });
    expect(within(screen.getByRole('banner')).getByText(/CRAWLER RIG DOROTHEA/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /gun the engine/i }));
    expect(mission().travelled).toBeGreaterThan(0);
    const before = mission().burn;
    await user.click(helm().getByRole('button', { name: /throttle up/i }));
    expect(mission().burn).toBe(before + 1);
    expect(within(screen.getByRole('region', { name: /route/i })).getByText(DEPOTS[0]!)).toBeTruthy();
  });

  it('sends for a fuel truck between depots', () => {
    setup({ engines: { ...blank().engines, bogie: 2 }, credits: 1_000 });
    expect(helm().getByRole('button', { name: /fuel truck/i })).toBeTruthy();
  });

  it('fits powertrains and hitches trailers', async () => {
    const user = setup({ credits: 1e6 });
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    expect(screen.getByRole('heading', { name: /the rig/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: new RegExp(`fit ${RIG_ENGINES[0]!.name}`, 'i') }));
    expect(mission().engines[RIG_ENGINES[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`hitch ${TRAILERS[0]!.name}`, 'i') }));
    expect(mission().cars[TRAILERS[0]!.id]).toBe(1);
  });

  it('offers only the promotion at the lift', async () => {
    const user = setup({ flags: ['terminus'] });
    await user.click(screen.getByRole('tab', { name: /terminus/i }));
    const panel = within(screen.getByRole('tabpanel', { name: /terminus/i }));
    expect(panel.getByRole('heading', { name: /take the promotion/i })).toBeTruthy();
    expect(panel.queryByRole('heading', { name: /stay on the ground/i })).toBeNull();
  });
});
