// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createDialog } from '../../src/engine/ui/dialog';
import { h } from '../../src/engine/ui/dom';

beforeEach(() => {
  document.body.replaceChildren();
});

function mount(options: Parameters<typeof createDialog>[0] = { title: 'Configuration', className: 'cfg' }) {
  const opener = h('button', { type: 'button' }, 'Open');
  const dialog = createDialog(options);
  dialog.body.append(h('p', {}, 'Inside'));
  opener.addEventListener('click', () => dialog.open());
  document.body.append(opener, dialog.el);
  return { opener, dialog, user: userEvent.setup() };
}

describe('a modal dialog', () => {
  it('is a labelled modal dialog, hidden until opened', async () => {
    const { opener, user } = mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Configuration' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Inside')).toBeTruthy();
  });

  it('moves focus into the dialog on opening, and back to what opened it on closing', async () => {
    const { opener, user } = mount();
    await user.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on Escape', async () => {
    const { opener, user } = mount();
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('tells the game when it closes', async () => {
    let closed = 0;
    const { opener, user } = mount({ title: 'Setup', className: 'setup', onClose: () => closed++ });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(closed).toBe(1);
  });

  it('can carry its own words on the close button, keeping the accessible name', async () => {
    const { opener, user } = mount({ title: 'Setup', className: 'setup', closeText: 'EJECT ⏏' });
    await user.click(opener);
    expect(screen.getByRole('button', { name: 'Close' }).textContent).toBe('EJECT ⏏');
  });

  it('can be a choice that must be made: no close button, and Escape does nothing', async () => {
    const { dialog, user } = mount({ title: 'Choose a contract', className: 'assign', closable: false });
    dialog.set(true);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Choose a contract' })).toBeTruthy();
    dialog.set(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('can change its title as the game changes', async () => {
    const { opener, dialog, user } = mount({ title: '', className: 'guide-rules' });
    dialog.setTitle('How the Source works');
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'How the Source works' })).toBeTruthy();
  });

  it('names its parts after the class it is given, so each game styles it its own way', () => {
    const { dialog } = mount({ title: 'Doors', className: 'doors', titleClass: 'panel-title' });
    expect(dialog.el.className).toBe('doors');
    expect(dialog.el.querySelector('.doors-box .doors-head .panel-title')).not.toBeNull();
    expect(dialog.el.querySelector('.doors-close')).not.toBeNull();
  });
});
