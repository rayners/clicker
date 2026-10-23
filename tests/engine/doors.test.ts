// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createDoors } from '../../src/engine/ui/doors';

interface S {
  open: boolean;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the doors to a game\'s other sides', () => {
  const mount = (onOpen = vi.fn()) => {
    const doors = createDoors<S>({
      button: { text: '0-77', aria: 'Restricted files', className: 'x' },
      title: 'RESTRICTED FILES',
      doors: [
        {
          describe: 'Play as what came aboard.',
          render: (s) => (s.open ? { text: 'SPECIAL ORDER 0-77: ACCEPT', aria: 'Accept Special Order 0-77', disabled: false } : { text: 'RESTRICTED · CLEARANCE REQUIRED', aria: 'Restricted: clearance required', disabled: true, secret: true }),
          onOpen,
        },
      ],
    });
    document.body.append(doors.button, doors.dialog);
    return { doors, onOpen, user: userEvent.setup() };
  };

  it('opens from its own button, away from the settings, and lists each door with its state', async () => {
    const { doors, user } = mount();
    doors.render({ open: false });
    await user.click(screen.getByRole('button', { name: 'Restricted files' }));
    const dialog = within(screen.getByRole('dialog', { name: 'RESTRICTED FILES' }));
    const door = dialog.getByRole('button', { name: /restricted: clearance required/i });
    expect((door as HTMLButtonElement).disabled).toBe(true);
    // A secret door says nothing about what is behind it.
    expect(dialog.getByText('Play as what came aboard.').hidden).toBe(true);
    doors.render({ open: true });
    expect(dialog.getByText('Play as what came aboard.').hidden).toBe(false);
  });

  it('goes through an open door and closes the list', async () => {
    const { doors, onOpen, user } = mount();
    doors.render({ open: true });
    await user.click(screen.getByRole('button', { name: 'Restricted files' }));
    await user.click(screen.getByRole('button', { name: /accept special order 0-77/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(doors.dialog.hidden).toBe(true);
  });

  it('closes on its close button and on Escape', async () => {
    const { doors, user } = mount();
    doors.render({ open: true });
    await user.click(screen.getByRole('button', { name: 'Restricted files' }));
    await user.keyboard('{Escape}');
    expect(doors.dialog.hidden).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Restricted files' }));
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(doors.dialog.hidden).toBe(true);
  });
});
