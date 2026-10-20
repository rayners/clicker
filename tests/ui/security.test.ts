// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { createMission, SECURITY_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { FABRICATORS, SECTIONS, TROOPERS } from '../../src/data/security/systems';
import { SECURITY_UPGRADES } from '../../src/data/security/upgrades';

type S = MissionOf<'security', 'organism'>;
let store: Store;

function setup(patch: Partial<S> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...createMission(SECURITY_MISSION_CONFIG, 1), ...patch } });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const mission = () => store.getState().mission as S;
const flow = () => within(screen.getByRole('region', { name: /production flow/i }));
const site = () => within(screen.getByRole('region', { name: /colony sectors/i }));
const split = () => within(screen.getByRole('region', { name: /force split/i }));
const rifles = TROOPERS[0]!;
const securedTo = (n: number) => SECTIONS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));
const net = SECURITY_UPGRADES.find((u) => u.effect.kind === 'tacticalNet')!;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a security contract on screen', () => {
  it('shows the transport and a fire-support button instead of the drill', () => {
    setup();
    expect(within(screen.getByRole('banner')).getByText(/BELLWETHER ASCENT/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /call fire support/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /execute drill cycle/i })).toBeNull();
  });

  it('pushes the frontier when fire support is called', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /call fire support/i }));
    expect(mission().ground[0]!.control).toBeGreaterThan(0);
  });

  it('headlines ammunition, assault force and income', () => {
    setup();
    expect(flow().getByLabelText('Ammunition supply')).toBeTruthy();
    expect(flow().getByLabelText('Assault force')).toBeTruthy();
    expect(flow().getByLabelText('Income')).toBeTruthy();
  });

  it('calls out ammunition as the bottleneck when the guns outrun the fabricators', () => {
    setup({ troopers: { ...createMission(SECURITY_MISSION_CONFIG, 1).troopers, [rifles.id]: 100 } });
    const region = screen.getByRole('region', { name: /production flow/i });
    expect(region.dataset.bottleneck).toBe('ammo');
    expect(flow().getByText(/AMMO-LIMITED/)).toBeTruthy();
  });

  it('warns when the line is stretched too thin to hold what has been taken', () => {
    setup({ ground: securedTo(5), assaultShare: 10, troopers: { ...createMission(SECURITY_MISSION_CONFIG, 1).troopers, [rifles.id]: 5 } });
    const region = screen.getByRole('region', { name: /production flow/i });
    expect(region.dataset.bottleneck).toBe('hold');
  });

  it('shows every colony sector: secured, the frontier, and what is still lost', () => {
    setup({ ground: securedTo(2) });
    const items = site().getAllByRole('listitem');
    expect(items).toHaveLength(SECTIONS.length);
    expect(items[0]!.dataset.state).toBe('secured');
    expect(items[2]!.dataset.state).toBe('frontier');
    expect(items[3]!.dataset.state).toBe('lost');
    expect(site().getByText(SECTIONS[2]!.name)).toBeTruthy();
  });

  it('shows contested sectors slipping', () => {
    setup({ ground: securedTo(2).map((s, i) => (i === 0 ? { ...s, control: 0.7 } : s)) });
    expect(site().getAllByRole('listitem')[0]!.dataset.state).toBe('contested');
  });

  it('moves a tenth of the force between assault and holding per tap', async () => {
    const user = setup();
    const before = mission().assaultShare;
    await user.click(split().getByRole('button', { name: /more to the line/i }));
    expect(mission().assaultShare).toBe(before - 1);
    await user.click(split().getByRole('button', { name: /more to the assault/i }));
    expect(mission().assaultShare).toBe(before);
    expect(split().getByLabelText('Assault share').textContent).toBe(`${before * 10}%`);
  });

  it('hands the split to WARDEN once the tactical net is installed, and takes it back on request', async () => {
    const user = setup({ upgrades: [net.id] });
    expect(split().queryByRole('button', { name: /more to the line/i })).toBeNull();
    await user.click(split().getByRole('button', { name: /take control from warden/i }));
    expect(mission().netOff).toBe(true);
    expect(split().getByRole('button', { name: /more to the line/i })).toBeTruthy();
  });

  it('deploys troopers, fabricators and sentry guns', async () => {
    const user = setup({ credits: 1e6 });
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`deploy ${rifles.name}`, 'i') }));
    expect(mission().troopers[rifles.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`build ${FABRICATORS[0]!.name}`, 'i') }));
    expect(mission().fabricators[FABRICATORS[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: /install sentry gun/i }));
    expect(mission().sentries).toBe(1);
  });

  it('lists security requisitions and buys them', async () => {
    const user = setup({ credits: 1e6, recovered: 1e3 });
    await user.click(screen.getByRole('tab', { name: /upgrades/i }));
    const first = SECURITY_UPGRADES[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(first.name, 'i') }));
    expect(mission().upgrades).toContain(first.id);
  });
});
