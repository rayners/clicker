// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createLateGame, newLateGame, type LateGame } from '../../src/late-fees/game';
import { createLateStore, type LateStore } from '../../src/late-fees/store';
import { mountLate } from '../../src/late-fees-ui/app';
import { COUNSELORS, LIGHTS, ZONES } from '../../src/late-fees-data/camp';
import { CAMP_UPGRADES } from '../../src/late-fees-data/camp-upgrades';
import { NIGHT_FROM } from '../../src/late-fees/camp/economy';
import { createOptOut } from '../../src/shared/telemetry';
import type { CampRun } from '../../src/late-fees/state';

let store: LateStore;

function setup(game: LateGame) {
  document.body.innerHTML = '<div id="app"></div>';
  store = createLateStore(game);
  mountLate(document.getElementById('app')!, store);
  return userEvent.setup();
}
const playing = (patch: Partial<CampRun> = {}) => {
  const g = createLateGame(1, 0);
  return { ...g, run: { ...g.run, ...patch } as LateGame['run'] };
};
const run = () => store.getState().run as CampRun;
const openTo = (n: number) => ZONES.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the shelf', () => {
  it('greets a new player with the horror shelf, and renting Friday the 12th starts it', async () => {
    const user = setup(newLateGame(1, 0));
    const shelf = within(screen.getByRole('dialog', { name: /horror/i }));
    expect(shelf.getByRole('button', { name: /^rent a nightmare on sycamore street$/i })).toBeTruthy();
    expect(shelf.getByRole('button', { name: /^rent penultimate destination$/i })).toBeTruthy();
    await user.click(shelf.getByRole('button', { name: /^rent friday the 12th$/i }));
    expect(store.getState().shelf).toBe(false);
    expect(screen.queryByRole('dialog', { name: /horror/i })).toBeNull();
  });
});

describe('Camp Blackwater on tape', () => {
  it('shows the tape title and a running tape counter', () => {
    setup(playing({ elapsed: 3_725 }));
    const osd = within(screen.getByRole('banner'));
    expect(osd.getByText('FRIDAY THE 12TH')).toBeTruthy();
    expect(osd.getByLabelText('Tape counter').textContent).toBe('1:02:05');
  });

  it('blows the whistle to open the camp', async () => {
    const user = setup(playing());
    await user.click(screen.getByRole('button', { name: /blow the whistle/i }));
    expect(run().zones[0]!.control).toBeGreaterThan(0);
  });

  it('headlines light, prep work and takings', () => {
    setup(playing());
    const flow = within(screen.getByRole('region', { name: /production flow/i }));
    expect(flow.getByLabelText('Light')).toBeTruthy();
    expect(flow.getByLabelText('Prep work')).toBeTruthy();
    expect(flow.getByLabelText('Takings')).toBeTruthy();
  });

  it('shows the body count and the camp\'s reputation', () => {
    setup(playing({ bodyCount: 13, reputation: 0.5 }));
    expect(screen.getByLabelText('Body count').textContent).toBe('13');
    expect(screen.getByLabelText('Reputation').textContent).toBe('50%');
  });

  it('records at night: the red light comes on', () => {
    setup(playing({ elapsed: NIGHT_FROM + 10 }));
    expect(document.getElementById('app')!.dataset.night).toBe('true');
    expect(screen.getByLabelText('Time of day').textContent).toMatch(/NIGHT/);
  });

  it('lists every zone of the camp: open, slipping, the frontier, still closed', () => {
    setup(playing({ zones: openTo(2).map((z, i) => (i === 1 ? { ...z, control: 0.7 } : z)) }));
    const items = within(screen.getByRole('region', { name: /camp zones/i })).getAllByRole('listitem');
    expect(items).toHaveLength(ZONES.length);
    expect(items[0]!.dataset.state).toBe('open');
    expect(items[1]!.dataset.state).toBe('slipping');
    expect(items[2]!.dataset.state).toBe('frontier');
    expect(items[3]!.dataset.state).toBe('closed');
  });

  it('moves a tenth of the staff between prep and watch per tap, until the head counselor takes over', async () => {
    const user = setup(playing());
    const split = within(screen.getByRole('region', { name: /staff split/i }));
    const before = run().prepShare;
    await user.click(split.getByRole('button', { name: /more on watch/i }));
    expect(run().prepShare).toBe(before - 1);
    await user.click(split.getByRole('button', { name: /more on prep/i }));
    expect(run().prepShare).toBe(before);
    const head = CAMP_UPGRADES.find((u) => u.effect.kind === 'headCounselor')!;
    const user2 = setup(playing({ upgrades: [head.id] }));
    const split2 = within(screen.getByRole('region', { name: /staff split/i }));
    expect(split2.queryByRole('button', { name: /more on watch/i })).toBeNull();
    await user2.click(split2.getByRole('button', { name: /take the roster back/i }));
    expect(run().headOff).toBe(true);
  });

  it('hires staff, buys lights and builds watchtowers', async () => {
    const user = setup(playing({ cash: 1e6 }));
    await user.click(screen.getByRole('tab', { name: /staff/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`hire ${COUNSELORS[0]!.name}`, 'i') }));
    expect(run().counselors[COUNSELORS[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`buy ${LIGHTS[0]!.name}`, 'i') }));
    expect(run().lights[LIGHTS[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: /build watchtower/i }));
    expect(run().towers).toBe(1);
  });

  it('sells camp supplies in the store', async () => {
    const user = setup(playing({ cash: 1e6, lifetimeCash: 1e3 }));
    await user.click(screen.getByRole('tab', { name: /store/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(CAMP_UPGRADES[0]!.name, 'i') }));
    expect(run().upgrades).toContain(CAMP_UPGRADES[0]!.id);
  });

  it('rolls credits with the endings, and the sequel goes on the shelf', async () => {
    const user = setup(playing({ flags: ['terminus'], bodyCount: 40 }));
    await user.click(screen.getByRole('tab', { name: /credits/i }));
    const credits = within(screen.getByRole('tabpanel', { name: /credits/i }));
    expect(credits.getByText(/40 DEAD THIS SUMMER/)).toBeTruthy();
    await user.click(credits.getByRole('button', { name: /put him back in the water/i }));
    expect(store.getState().shelf).toBe(true);
    expect(within(screen.getByRole('dialog', { name: /horror/i })).getByRole('button', { name: /^rent friday the 12th part ii$/i })).toBeTruthy();
  });
});

describe('the setup menu', () => {
  it('lets the player stop sharing anonymous play data', async () => {
    localStorage.clear();
    const user = setup(playing());
    await user.click(screen.getByRole('button', { name: /^setup$/i }));
    const dialog = within(screen.getByRole('dialog', { name: /setup/i }));
    await user.click(dialog.getByRole('checkbox', { name: /share anonymous play data/i }));
    expect(createOptOut(localStorage).sharing()).toBe(false);
  });
});
