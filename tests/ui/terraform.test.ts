// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { createMission, TERRAFORM_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { PROCESSORS, REACTORS } from '../../src/data/terraform/systems';
import { TERRAFORM_UPGRADES } from '../../src/data/terraform/upgrades';
import { incomeRate, power, specMatch, surgePower } from '../../src/mission/terraform/economy';
import { formatNumber } from '../../src/engine/format';

type T = MissionOf<'terraform', 'organism'>;
let store: Store;
let root: HTMLElement;

function setup(patch: Partial<T> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...createMission(TERRAFORM_MISSION_CONFIG, 1), ...patch } });
  mountApp(root, store);
  return userEvent.setup();
}

const mission = () => store.getState().mission as T;
const flow = () => within(screen.getByRole('region', { name: /production flow/i }));
const allocation = () => within(screen.getByRole('region', { name: /power allocation/i }));
const cracker = PROCESSORS.find((p) => p.id === 'cracker')!;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a terraforming contract on screen', () => {
  it('shows the station and a surge button instead of the drill', () => {
    setup();
    expect(within(screen.getByRole('banner')).getByText(/OSTRAVA-9 STATION/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /fire processor surge/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /execute drill cycle/i })).toBeNull();
  });

  it('surges on press, showing the yield', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /fire processor surge/i }));
    expect(mission().processed).toBeCloseTo(surgePower(mission()));
    expect(root.querySelector('.drill-tick')?.textContent).toBe(`+${formatNumber(1)}`);
  });
});

describe('terraform production flow (power -> processing -> income)', () => {
  const starved = { processors: { ...createMission(TERRAFORM_MISSION_CONFIG, 1).processors, cracker: 200, emitter: 150, melter: 150 } };

  it('headlines power, processing and income', () => {
    setup(starved);
    expect(flow().getByLabelText(/available power/i).textContent).toBe(formatNumber(power(mission())));
    expect(flow().getByLabelText(/income/i).textContent).toBe(formatNumber(incomeRate(mission())));
  });

  it('shows how closely processing matches the corporate spec', () => {
    setup(starved);
    expect(flow().getByRole('meter', { name: /spec match/i }).getAttribute('aria-valuenow')).toBe(String(Math.round(specMatch(mission()) * 100)));
  });

  it('calls out power as the bottleneck when processors outrun the reactors', () => {
    setup(starved);
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('power');
    expect(flow().getByText(/POWER/)).toBeTruthy();
  });
});

describe('power allocation', () => {
  it("shows each line's share and the spec's target", () => {
    setup();
    expect(allocation().getByLabelText(/atmosphere share/i).textContent).toBe('40%');
    expect(allocation().getByText(/SPEC 40%/)).toBeTruthy();
  });

  it('moves power with one tap per 10% step', async () => {
    const user = setup();
    await user.click(allocation().getByRole('button', { name: /more power to heat/i }));
    expect(mission().allocation.heat).toBe(4);
    expect(allocation().getByLabelText(/heat share/i).textContent).toBe('40%');
    await user.click(allocation().getByRole('button', { name: /less power to water/i }));
    expect(mission().allocation.water).toBe(2);
  });

  it('says which lines are starved of power', () => {
    setup({ processors: { ...createMission(TERRAFORM_MISSION_CONFIG, 1).processors, cracker: 200 } });
    expect(allocation().getByText(/POWER-LIMITED/)).toBeTruthy();
  });

  it('hands the controls to WARDEN once the load balancer is installed', () => {
    const balancer = TERRAFORM_UPGRADES.find((u) => u.effect.kind === 'autoBalance')!;
    setup({ upgrades: [balancer.id] });
    expect(allocation().queryByRole('button', { name: /more power/i })).toBeNull();
    expect(allocation().getByText(/WARDEN BALANCING/)).toBeTruthy();
  });

  it('folds the three lines into one summary while WARDEN balances, to save room on a phone', () => {
    const balancer = TERRAFORM_UPGRADES.find((u) => u.effect.kind === 'autoBalance')!;
    setup({ upgrades: [balancer.id] });
    for (const el of allocation().queryAllByText(/AT CAPACITY|POWER-LIMITED|NO PROCESSORS/)) expect(el.closest('[hidden]')).not.toBeNull();
    expect(allocation().getByLabelText('Power split').textContent).toMatch(/^\S+ \d+% · \S+ \d+% · \S+ \d+%$/);
  });
});

describe('terraform systems panel', () => {
  it('builds reactors and processors', async () => {
    const user = setup({ credits: 1_000 });
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`build ${REACTORS[0]!.name}`, 'i') }));
    await user.click(screen.getByRole('button', { name: new RegExp(`build ${cracker.name}`, 'i') }));
    expect(mission().reactors[REACTORS[0]!.id]).toBe(1);
    expect(mission().processors[cracker.id]).toBe(1);
  });

  it('shows what one more of each would add to income, and says why when it would add nothing', async () => {
    const user = setup({ credits: 1_000 });
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    expect(screen.getByLabelText(`${REACTORS[0]!.name} income`).textContent).toBe('+0 CR/S · NO PROCESSORS TO FEED');
    expect(screen.getByLabelText(`${cracker.name} income`).textContent).toMatch(/^\+[\d.]+\w* CR\/S$/);
  });
});

describe('terraform upgrades panel', () => {
  it('lists terraform requisitions and buys them', async () => {
    const first = TERRAFORM_UPGRADES[0]!;
    const user = setup({ credits: 1e6, lifetimeUnits: 1e3 });
    await user.click(screen.getByRole('tab', { name: /upgrades/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`purchase ${first.name}`, 'i') }));
    expect(mission().upgrades).toContain(first.id);
  });
});

describe('terraform operations monitor', () => {
  it('lists running processors and reactors', () => {
    setup({
      processors: { ...createMission(TERRAFORM_MISSION_CONFIG, 1).processors, cracker: 3 },
      reactors: { ...createMission(TERRAFORM_MISSION_CONFIG, 1).reactors, cells: 2 },
    });
    const rows = within(screen.getByRole('region', { name: /operations monitor/i })).getAllByRole('listitem');
    expect(rows.map((r) => r.dataset.system)).toEqual(['cells', 'cracker']);
  });
});

describe('terraform terminus', () => {
  it("words the horror's endings for a colony rather than a cargo hold", async () => {
    const user = setup({ act: 4, flags: ['specimens', 'tracker', 'terminus'] });
    await user.click(screen.getByRole('tab', { name: /terminus/i }));
    expect(screen.getByRole('region', { name: /certify the colony/i })).toBeTruthy();
    expect(screen.getByRole('region', { name: /sterilise merrow/i })).toBeTruthy();
    expect(screen.queryByText(/\{[a-zA-Z]+\}/)).toBeNull();
  });
});

describe('the colony on screen', () => {
  const colony = () => within(screen.getByRole('region', { name: /colony/i }));
  const human = { atmosphere: 101.3, heat: 288, water: 60 };

  it('shows habitability, colonists alive and lost', () => {
    setup({ processed: 1e9, climate: human, colonists: 400, wavesThawed: 1, colonistsLost: 12 });
    expect(colony().getByLabelText(/habitability/i).textContent).toBe('100%');
    expect(colony().getByText(/400 ALIVE/)).toBeTruthy();
    expect(colony().getByText(/12 LOST/)).toBeTruthy();
  });

  it('thaws a ready wave on the player\'s say-so', async () => {
    const user = setup({ processed: 1e9, climate: human });
    await user.click(colony().getByRole('button', { name: /thaw wave 1/i }));
    expect(mission().wavesThawed).toBe(1);
    expect(mission().colonists).toBe(400);
  });

  it('says what a ready wave is waiting for when the planet is not livable enough', () => {
    setup({ processed: 1e9, climate: { atmosphere: 20, heat: 120, water: 5 } });
    const thaw = colony().getByRole('button', { name: /thaw wave 1/i }) as HTMLButtonElement;
    expect(thaw.disabled).toBe(true);
    expect(colony().getByText(/NEEDS 45%/)).toBeTruthy();
  });

  it('marks each reading against the human ideal', () => {
    setup({ climate: { atmosphere: 101.3, heat: 330, water: 60 } });
    expect(allocation().getByText(/330 K ▲/)).toBeTruthy();
  });

  it("lets the player take the allocation back from WARDEN's load balancer", async () => {
    const balancer = TERRAFORM_UPGRADES.find((u) => u.effect.kind === 'autoBalance')!;
    const user = setup({ upgrades: [balancer.id] });
    await user.click(allocation().getByRole('button', { name: /take control/i }));
    expect(mission().balancerOff).toBe(true);
    expect(allocation().getByRole('button', { name: /more power to heat/i })).toBeTruthy();
    await user.click(allocation().getByRole('button', { name: /return control to warden/i }));
    expect(mission().balancerOff).toBe(false);
  });

  it('names who is on the surface at the terminus', async () => {
    const user = setup({ act: 4, flags: ['specimens', 'tracker', 'terminus'], wavesThawed: 2, colonists: 640, colonistsLost: 360 });
    await user.click(screen.getByRole('tab', { name: /terminus/i }));
    expect(screen.getByText(/640 COLONISTS ALIVE/)).toBeTruthy();
  });
});
