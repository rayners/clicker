// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { BOOT_LINES, createBootScreen } from '../../src/ui/boot';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the boot sequence on a first load', () => {
  it('prints WARDEN coming online, line by line', () => {
    document.body.append(createBootScreen({ onDone: () => undefined }).el);
    const lines = screen.getAllByRole('listitem');
    expect(lines).toHaveLength(BOOT_LINES.length);
    expect(lines[0]!.textContent).toMatch(/KESSLER-AMARI/);
    expect(screen.getByRole('dialog', { name: /warden is starting/i })).toBeTruthy();
  });

  it('can be skipped with a tap, and gets out of the way', async () => {
    const onDone = vi.fn();
    const boot = createBootScreen({ onDone });
    document.body.append(boot.el);
    await userEvent.setup().click(screen.getByRole('button', { name: /skip/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(document.body.contains(boot.el)).toBe(false);
  });

  it('finishes on its own once every line has printed', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    document.body.append(createBootScreen({ onDone }).el);
    vi.advanceTimersByTime(60_000);
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('prints everything at once for players who reduce motion', () => {
    const boot = createBootScreen({ onDone: () => undefined, reducedMotion: true });
    expect(boot.el.dataset.motion).toBe('reduced');
  });
});
