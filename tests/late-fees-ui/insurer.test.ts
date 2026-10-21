// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { newLateGame, type LateGame } from '../../src/late-fees/game';
import { chooseTape } from '../../src/late-fees/sequels';
import { createLateStore, type LateStore } from '../../src/late-fees/store';
import { mountLate } from '../../src/late-fees-ui/app';
import { AGENTS, POLICIES, SURVIVORS } from '../../src/late-fees-data/insurer';
import { INSURER_UPGRADES } from '../../src/late-fees-data/insurer-upgrades';
import type { InsurerRun } from '../../src/late-fees/state';

let store: LateStore;
const base = () => chooseTape(newLateGame(1, 0), 'insurer', 1);

function setup(patch: Partial<InsurerRun> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = base();
  store = createLateStore({ ...g, run: { ...g.run, ...patch } as LateGame['run'] });
  mountLate(document.getElementById('app')!, store);
  return userEvent.setup();
}
const run = () => store.getState().run as InsurerRun;
const book = (n: number) => ({ ...(base().run as InsurerRun).policies, [POLICIES[0]!.id]: n });

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Providence Mutual on tape', () => {
  it('shows the tape title and sells policies by hand', async () => {
    const user = setup();
    expect(within(screen.getByRole('banner')).getByText('PENULTIMATE DESTINATION')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /sell a policy/i }));
    expect(run().cash).toBeGreaterThan(0);
  });

  it('headlines prevention, the design and premiums', () => {
    setup();
    const flow = within(screen.getByRole('region', { name: /production flow/i }));
    expect(flow.getByLabelText('Prevention')).toBeTruthy();
    expect(flow.getByLabelText("Death's design")).toBeTruthy();
    expect(flow.getByLabelText('Premiums')).toBeTruthy();
  });

  it('warns when the design is outrunning prevention', () => {
    setup({ policies: book(40) });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('design');
  });

  it('shows the list: who is next, how close the design is, and how many are left', () => {
    setup({ policies: book(5), omens: 0.42 });
    const list = within(screen.getByRole('region', { name: /the list/i }));
    expect(list.getByText(new RegExp(`NEXT: ${SURVIVORS[0]}`))).toBeTruthy();
    expect(list.getByLabelText('Omens').textContent).toBe('42%');
    expect(list.getByText(new RegExp(`${SURVIVORS.length} NAMES`))).toBeTruthy();
  });

  it('moves the risk appetite a tenth per tap, until the mainframe takes it', async () => {
    const user = setup();
    const dial = within(screen.getByRole('region', { name: /risk appetite/i }));
    const before = run().appetite;
    await user.click(dial.getByRole('button', { name: /more risk/i }));
    expect(run().appetite).toBe(before + 1);
    await user.click(dial.getByRole('button', { name: /less risk/i }));
    expect(run().appetite).toBe(before);
    const mainframe = INSURER_UPGRADES.find((u) => u.effect.kind === 'actuary')!;
    const user2 = setup({ upgrades: [mainframe.id] });
    const dial2 = within(screen.getByRole('region', { name: /risk appetite/i }));
    expect(dial2.queryByRole('button', { name: /more risk/i })).toBeNull();
    await user2.click(dial2.getByRole('button', { name: /take the appetite back/i }));
    expect(run().actuaryOff).toBe(true);
  });

  it('writes policies and hires prevention on the office tab', async () => {
    const user = setup({ cash: 1e6 });
    await user.click(screen.getByRole('tab', { name: /office/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`write ${POLICIES[0]!.name}`, 'i') }));
    expect(run().policies[POLICIES[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`hire ${AGENTS[0]!.name}`, 'i') }));
    expect(run().agents[AGENTS[0]!.id]).toBe(1);
  });

  it('sells company supplies in the store', async () => {
    const user = setup({ cash: 1e6, lifetimeCash: 1e3 });
    await user.click(screen.getByRole('tab', { name: /store/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(INSURER_UPGRADES[0]!.name, 'i') }));
    expect(run().upgrades).toContain(INSURER_UPGRADES[0]!.id);
  });
});
