// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createConfirmButton } from '../../src/engine/ui/confirm';

describe('a two-tap button for things that cannot be undone', () => {
  const make = (onConfirm = vi.fn()) => {
    const b = createConfirmButton({ className: 'x', onConfirm, timeoutMs: 1000 });
    b.label('End the hunt for 3 Legend', 'END THE HUNT · +3 LEGEND');
    return { b, onConfirm };
  };

  it('asks for confirmation on the first tap and acts on the second', () => {
    vi.useFakeTimers();
    const { b, onConfirm } = make();
    b.el.click();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(b.el.getAttribute('aria-label')).toBe('Confirm: end the hunt for 3 Legend');
    vi.advanceTimersByTime(600);
    b.el.click();
    vi.useRealTimers();
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

  it('ignores a second tap that comes too soon after the first, so a double tap cannot confirm', () => {
    vi.useFakeTimers();
    const { b, onConfirm } = make();
    b.el.click();
    vi.advanceTimersByTime(80);
    b.el.click();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(b.el.getAttribute('aria-label')).toBe('Confirm: end the hunt for 3 Legend');
    vi.advanceTimersByTime(600);
    b.el.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
