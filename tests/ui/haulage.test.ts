// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { createMission, HAULAGE_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { CARS, ENGINES, stationName } from '../../src/data/haulage/systems';
import { HAULAGE_UPGRADES } from '../../src/data/haulage/upgrades';
import { fuelForLeg } from '../../src/mission/haulage/economy';

type H = MissionOf<'haulage', 'organism'>;
let store: Store;
const blank = () => createMission(HAULAGE_MISSION_CONFIG, 1) as H;

function setup(patch: Partial<H> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...blank(), ...patch } });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const mission = () => store.getState().mission as H;
const flow = () => within(screen.getByRole('region', { name: /production flow/i }));
const helm = () => within(screen.getByRole('region', { name: /helm/i }));
const route = () => within(screen.getByRole('region', { name: /route/i }));
const powered = { engines: { ...blank().engines, booster: 2 }, cars: { ...blank().cars, hopper: 2 } };
const autopilot = HAULAGE_UPGRADES.find((u) => u.effect.kind === 'autopilot')!;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a haulage contract on screen', () => {
  it('shows the tug and a thruster button instead of the drill', () => {
    setup();
    expect(within(screen.getByRole('banner')).getByText(/HALVORSEN GALE/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /fire thrusters/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /execute drill cycle/i })).toBeNull();
  });

  it('pushes the train along the leg when the thrusters fire', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /fire thrusters/i }));
    expect(mission().travelled).toBeGreaterThan(0);
  });

  it('headlines speed, freight value and income', () => {
    setup();
    expect(flow().getByLabelText('Speed')).toBeTruthy();
    expect(flow().getByLabelText('Freight value')).toBeTruthy();
    expect(flow().getByLabelText('Income')).toBeTruthy();
  });

  it('calls out an empty tank as the bottleneck', () => {
    setup({ ...powered, fuel: 0 });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('fuel');
    expect(flow().getByText(/TANKS DRY/)).toBeTruthy();
  });

  it('warns when the burn is straining the freight', () => {
    setup({ ...powered, fuel: 100, burn: 10 });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('strain');
  });

  it('shows the route: the next station, how far along, the window and the freight\'s condition', () => {
    setup({ ...powered, leg: 2, travelled: 10, condition: 0.8 });
    expect(route().getByText(stationName(2))).toBeTruthy();
    expect(route().getByLabelText(/window/i).textContent).toMatch(/\d/);
    expect(route().getByLabelText(/freight condition/i).textContent).toBe('80%');
  });

  it('sets the burn one notch at a time', async () => {
    const user = setup(powered);
    const before = mission().burn;
    await user.click(helm().getByRole('button', { name: /burn hotter/i }));
    expect(mission().burn).toBe(before + 1);
    await user.click(helm().getByRole('button', { name: /burn gentler/i }));
    expect(mission().burn).toBe(before);
    expect(helm().getByLabelText('Burn').textContent).toBe(String(before));
  });

  it('refuels at a station, or calls a fuel tender under way at a markup', async () => {
    const user = setup({ ...powered, credits: 1_000, docked: 5 });
    expect(helm().getByRole('button', { name: /refuel/i }).textContent).not.toMatch(/tender/i);
    await user.click(helm().getByRole('button', { name: /refuel/i }));
    expect(mission().fuel).toBeCloseTo(fuelForLeg({ ...blank(), ...powered, docked: 5 }));
    const under = setup({ ...powered, credits: 1_000 });
    await under.click(helm().getByRole('button', { name: /call a fuel tender/i }));
    expect(mission().fuel).toBeGreaterThan(0);
  });

  it('hands the burn to WARDEN once the autopilot is installed, and takes it back on request', async () => {
    const user = setup({ ...powered, upgrades: [autopilot.id] });
    expect(helm().queryByRole('button', { name: /burn hotter/i })).toBeNull();
    await user.click(helm().getByRole('button', { name: /take control from warden/i }));
    expect(mission().autopilotOff).toBe(true);
    expect(helm().getByRole('button', { name: /burn hotter/i })).toBeTruthy();
  });

  it('fits engines and couples cars', async () => {
    const user = setup({ credits: 1e6 });
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`fit ${ENGINES[0]!.name}`, 'i') }));
    expect(mission().engines[ENGINES[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`couple ${CARS[0]!.name}`, 'i') }));
    expect(mission().cars[CARS[0]!.id]).toBe(1);
  });

  it('lists haulage requisitions and buys them', async () => {
    const user = setup({ credits: 1e6, delivered: 1e3 });
    await user.click(screen.getByRole('tab', { name: /upgrades/i }));
    const first = HAULAGE_UPGRADES[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(first.name, 'i') }));
    expect(mission().upgrades).toContain(first.id);
  });
});
