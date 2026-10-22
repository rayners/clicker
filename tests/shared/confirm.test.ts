// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createConfirmButton } from '../../src/shared/ui/confirm';

describe('a two-tap button for things that cannot be undone', () => {
  const make = (onConfirm = vi.fn()) => {
    const b = createConfirmButton({ className: 'x', onConfirm, timeoutMs: 1000 });
    b.label('End the hunt for 3 Legend', 'END THE HUNT · +3 LEGEND');
    return { b, onConfirm };
  };

  it('asks for confirmation on the first tap and acts on the second', () => {
    const { b, onConfirm } = make();
    b.el.click();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(b.el.getAttribute('aria-label')).toBe('Confirm: end the hunt for 3 Legend');
    b.el.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(b.el.getAttribute('aria-label')).toBe('End the hunt for 3 Legend');
  });

  it('forgets the first tap after a while', () => {
    vi.useFakeTimers();
    const { b, onConfirm } = make();
    b.el.click();
    vi.advanceTimersByTime(1500);
    expect(b.el.textContent).toBe('END THE HUNT · +3 LEGEND');
    b.el.click();
    expect(onConfirm).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
