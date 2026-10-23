// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createTabs, type TabPanel } from '../../src/engine/ui/tabs';
import { createActionButton } from '../../src/engine/ui/action';
import { createShell } from '../../src/engine/ui/shell';
import { h, setText } from '../../src/engine/ui/dom';

interface Toy {
  coins: number;
  ended: boolean;
  broken?: boolean;
}
const toy = (patch: Partial<Toy> = {}): Toy => ({ coins: 0, ended: false, ...patch });

function mountTabs(extra: Partial<Parameters<typeof createTabs<Toy>>[0]> = {}) {
  const coins = h('p', {});
  const panels: TabPanel<Toy>[] = [
    { id: 'log', label: 'LOG', content: [h('p', {}, 'The log')], render: () => undefined },
    { id: 'shop', label: 'STORE', content: [coins], render: (s) => setText(coins, `${s.coins} COINS`), attention: (s) => s.coins > 10 },
    { id: 'end', label: "SEASON'S END", short: 'END', content: [h('p', {}, 'Choose')], render: () => undefined, visible: (s) => s.ended, attention: () => 'alert' },
  ];
  const root = h('div', {});
  const tabs = createTabs<Toy>({ label: 'Zones', home: 'log', side: 'shop', panels, root, ...extra });
  root.append(...tabs.sections, tabs.tabbar);
  document.body.replaceChildren(root);
  return { tabs, root, user: userEvent.setup() };
}

beforeEach(() => document.body.replaceChildren());

describe('tabs', () => {
  it('shows one panel at a time, chosen from a tab bar', async () => {
    const { tabs, user } = mountTabs();
    tabs.render(toy({ coins: 3 }));
    expect(screen.getByRole('tab', { name: 'LOG' }).getAttribute('aria-selected')).toBe('true');
    await user.click(screen.getByRole('tab', { name: 'STORE' }));
    expect(screen.getByRole('tab', { name: 'STORE' }).getAttribute('aria-selected')).toBe('true');
    expect(within(screen.getByRole('tabpanel', { name: 'STORE' })).getByText('3 COINS')).toBeTruthy();
  });

  it('keeps a tab hidden until its panel applies, and falls back home if it goes away while open', async () => {
    const { tabs, root, user } = mountTabs();
    tabs.render(toy());
    expect(screen.queryByRole('tab', { name: /season's end/i })).toBeNull();
    tabs.render(toy({ ended: true }));
    await user.click(screen.getByRole('tab', { name: /season's end/i }));
    tabs.render(toy());
    expect(root.dataset.tab).toBe('log');
  });

  it('marks a tab that wants attention, and says so to a screen reader', () => {
    const { tabs } = mountTabs();
    tabs.render(toy({ coins: 20, ended: true }));
    expect(screen.getByRole('tab', { name: 'STORE (active)' }).dataset.attention).toBe('active');
    expect(screen.getByRole('tab', { name: "SEASON'S END (needs attention)" }).dataset.attention).toBe('alert');
  });

  it('can carry a short label for a narrow tab bar, keeping the full name', () => {
    const { tabs } = mountTabs();
    tabs.render(toy({ ended: true }));
    const end = screen.getByRole('tab', { name: /season's end/i });
    expect(end.querySelector('.tab-short')!.textContent).toBe('END');
  });

  it('marks the panel for the desktop side column: the side panel while home is chosen', async () => {
    const { tabs, user } = mountTabs();
    tabs.render(toy());
    expect(tabs.sections[1]!.classList.contains('is-side')).toBe(true);
    await user.click(screen.getByRole('tab', { name: 'STORE' }));
    expect(tabs.sections[1]!.classList.contains('is-active')).toBe(true);
  });

  it('can rename a tab as the game changes (another venue, another name for its staff)', () => {
    const { tabs } = mountTabs();
    tabs.setLabel('shop', 'ORDERLIES');
    tabs.render(toy());
    expect(screen.getByRole('tab', { name: 'ORDERLIES' })).toBeTruthy();
  });

  it('can use a panel\'s own element as its section, keeping what the panel marks on it', () => {
    const own = h('section', { class: 'panel-projects', 'data-integrity': 'low' }, h('p', {}, 'Specimens'));
    const { tabs } = mountTabs({ panels: [{ id: 'log', label: 'LOG', content: [], render: () => undefined }, { id: 'projects', label: 'SPECIAL PROJECTS', el: own, render: () => undefined }] });
    tabs.render(toy());
    const panel = screen.getByRole('tabpanel', { name: 'SPECIAL PROJECTS', hidden: true });
    expect(panel).toBe(own);
    expect(panel.dataset.integrity).toBe('low');
  });

  it('keeps going when one panel fails to render', () => {
    const { tabs } = mountTabs({
      panels: [
        { id: 'log', label: 'LOG', content: [], render: () => { throw new Error('broken'); } },
        { id: 'shop', label: 'STORE', content: [h('p', { class: 'coins' })], render: (s) => setText(document.querySelector('.coins')!, String(s.coins)) },
      ],
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tabs.render(toy({ coins: 4 }));
    error.mockRestore();
    expect(document.querySelector('.coins')!.textContent).toBe('4');
  });
});

describe('the big action button', () => {
  it('acts on the press itself, not the click after it, so rapid taps on a phone all count', async () => {
    let presses = 0;
    const action = createActionButton({ className: 'drill', label: 'Execute drill cycle', onPress: () => `+${++presses}` });
    document.body.replaceChildren(action.el);
    action.el.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    action.el.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    expect(presses).toBe(1);
  });

  it('also works from the keyboard', async () => {
    let presses = 0;
    const action = createActionButton({ className: 'drill', label: 'Execute drill cycle', onPress: () => void presses++ });
    document.body.replaceChildren(action.el);
    action.el.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(presses).toBe(1);
  });

  it('can change what it says as the game changes, to a screen reader too', () => {
    const action = createActionButton({ className: 'whistle', label: 'Blow the whistle', onPress: () => undefined });
    document.body.replaceChildren(action.el);
    action.setLabel('Take a reading', 'TAKE A READING');
    expect(screen.getByRole('button', { name: 'Take a reading' }).textContent).toBe('TAKE A READING');
  });

  it('floats what each press earned off the button', () => {
    const action = createActionButton({ className: 'pass', label: 'Sell a beach pass', onPress: () => '+$2' });
    document.body.replaceChildren(action.el);
    action.el.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    expect(action.el.querySelector('.pass-tick')!.textContent).toBe('+$2');
  });
});

describe('the shell', () => {
  it('mounts the game and its overlays, and makes the game inert while something covers it', () => {
    const root = h('div', {});
    const button = h('button', { type: 'button' }, 'Drill');
    const layer = h('section', { 'aria-label': 'The hunt' });
    const shell = createShell(root, { className: 'sonar-shell', parts: [button], overlays: [layer] });
    expect(root.className).toBe('sonar-shell');
    expect(root.contains(layer)).toBe(true);
    shell.cover(true);
    expect(button.closest('[inert]')).not.toBeNull();
    shell.cover(false);
    expect(button.closest('[inert]')).toBeNull();
  });
});
