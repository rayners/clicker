// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createMonitor } from '../../src/engine/ui/monitor';

const rows = [{ id: 'clippers', label: 'AUTOCLIPPERS', period: 1, running: (n: number) => n > 0, count: (n: number) => `×${n}`, output: (n: number) => `${n}/S` }];

describe('the operations monitor', () => {
  it('says plainly when nothing is automated yet, or in the game\'s own words', () => {
    const plain = createMonitor(rows);
    plain.render(0);
    expect(plain.el.querySelector('.mon-idle')!.textContent).toBe('NOTHING AUTOMATED YET');
    const own = createMonitor(rows, { idle: 'NO AUTOCLIPPERS ON THE BENCH' });
    own.render(0);
    expect(own.el.querySelector('.mon-idle')!.textContent).toBe('NO AUTOCLIPPERS ON THE BENCH');
  });
});
