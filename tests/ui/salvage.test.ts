// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { createMission, SALVAGE_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { COMPARTMENTS, CUTTERS, SHORING } from '../../src/data/salvage/systems';
import { SALVAGE_UPGRADES } from '../../src/data/salvage/upgrades';

type S = MissionOf<'salvage', 'organism'>;
let store: Store;

function setup(patch: Partial<S> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...createMission(SALVAGE_MISSION_CONFIG, 1), ...patch } });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const mission = () => store.getState().mission as S;
const region = () => screen.getByRole('region', { name: /production flow/i });
const flow = () => within(region());
const hull = () => within(screen.getByRole('region', { name: /derelict compartments/i }));
const torch = () => within(screen.getByRole('region', { name: /cutting torch/i }));
const openTo = (n: number) => COMPARTMENTS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));
const governor = SALVAGE_UPGRADES.find((u) => u.effect.kind === 'governor')!;
const fresh = createMission(SALVAGE_MISSION_CONFIG, 1) as S;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a salvage contract on screen', () => {
  it('shows the salvage tug and a cut button instead of the drill', () => {
    setup();
    expect(within(screen.getByRole('banner')).getByText(/CORVID TITHE/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^cut$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /execute drill cycle/i })).toBeNull();
  });

  it('cuts into the frontier when the button is pressed', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^cut$/i }));
    expect(mission().ground[0]!.control).toBeGreaterThan(0);
  });

  it('headlines the cutting force, the shoring and the income', () => {
    setup();
    expect(flow().getByLabelText('Cutting force')).toBeTruthy();
    expect(flow().getByLabelText('Shoring')).toBeTruthy();
    expect(flow().getByLabelText('Income')).toBeTruthy();
  });

  it('warns when the shoring cannot carry the compartments already open', () => {
    setup({ ground: openTo(4), cutters: { ...fresh.cutters, [CUTTERS[0]!.id]: 5 } });
    expect(region().dataset.bottleneck).toBe('shoring');
  });

  it('says so when a breach has sealed the frontier', () => {
    setup({ sealedFor: 30, cutters: { ...fresh.cutters, [CUTTERS[0]!.id]: 5 } });
    expect(region().dataset.bottleneck).toBe('breach');
    expect(flow().getByText(/SEALED/)).toBeTruthy();
  });

  it('shows every compartment: open, the one being cut, and what is still shut', () => {
    setup({ ground: openTo(2) });
    const items = hull().getAllByRole('listitem');
    expect(items).toHaveLength(COMPARTMENTS.length);
    expect(items[0]!.dataset.state).toBe('secured');
    expect(items[2]!.dataset.state).toBe('frontier');
    expect(items[3]!.dataset.state).toBe('lost');
    expect(hull().getByText(COMPARTMENTS[2]!.name)).toBeTruthy();
    expect(items[0]!.textContent).toMatch(/OPEN/);
  });

  it('turns the torch up and down a notch per tap, and shows the hull stress', async () => {
    const user = setup({ stress: 0.42 });
    await user.click(torch().getByRole('button', { name: /hotter/i }));
    expect(mission().notch).toBe(6);
    expect(torch().getByLabelText('Torch notch').textContent).toBe('6');
    await user.click(torch().getByRole('button', { name: /cooler/i }));
    expect(mission().notch).toBe(5);
    expect(torch().getByLabelText('Hull stress').textContent).toBe('42%');
  });

  it('hands the torch to the hull governor once installed, and takes it back on request', async () => {
    const user = setup({ upgrades: [governor.id] });
    expect(torch().queryByRole('button', { name: /hotter/i })).toBeNull();
    await user.click(torch().getByRole('button', { name: /take control from warden/i }));
    expect(mission().governorOff).toBe(true);
    expect(torch().getByRole('button', { name: /hotter/i })).toBeTruthy();
  });

  it('sells cutters and shoring', async () => {
    const user = setup({ credits: 1e6 });
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`hire ${CUTTERS[0]!.name}`, 'i') }));
    expect(mission().cutters[CUTTERS[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`fit ${SHORING[0]!.name}`, 'i') }));
    expect(mission().shoring[SHORING[0]!.id]).toBe(1);
  });

  it('lists salvage requisitions and buys them', async () => {
    const user = setup({ credits: 1e6, recovered: 1e3 });
    await user.click(screen.getByRole('tab', { name: /upgrades/i }));
    const first = SALVAGE_UPGRADES[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(first.name, 'i') }));
    expect(mission().upgrades).toContain(first.id);
  });

  it('keeps the compartment column short on a phone: the rooms that matter, and a count of the rest', () => {
    setup({ ground: openTo(7).map((s, i) => (i === 2 ? { ...s, control: 0.6 } : s)) });
    const items = hull().getAllByRole('listitem');
    const near = items.filter((li) => li.dataset.far !== 'true').map((li) => li.textContent);
    expect(near).toEqual([
      expect.stringMatching(/CREW QUARTERS.*BUCKLING/),
      expect.stringMatching(/CRYO BAY B.*OPEN/),
      expect.stringMatching(/CRYO BAY C.*CUTTING/),
      expect.stringMatching(/MACHINE SHOP/),
    ]);
    expect(hull().getByText('5 MORE OPEN')).toBeTruthy();
    expect(hull().getByText('5 MORE SHUT')).toBeTruthy();
  });
});
