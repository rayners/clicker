// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createLogView } from '../../src/engine/ui/log';

const entry = (id: number, text: string) => ({ id, t: id, kind: 'note' as const, text });

describe('the log feed', () => {
  it('prints every entry, whatever number the log starts counting from', () => {
    const log = createLogView<'note'>({ label: 'Log', stamp: String });
    log.render([entry(0, 'The first line.'), entry(1, 'The second.')], 'run');
    expect([...log.el.querySelectorAll('.log-text')].map((e) => e.textContent)).toEqual(['The first line.', 'The second.']);
  });

  it('prints only what is new on later renders, and starts over for a new run', () => {
    const log = createLogView<'note'>({ label: 'Log', stamp: String });
    log.render([entry(1, 'One.')], 'a');
    expect(log.render([entry(1, 'One.'), entry(2, 'Two.')], 'a').map((e) => e.text)).toEqual(['Two.']);
    log.render([entry(1, 'Fresh.')], 'b');
    expect([...log.el.querySelectorAll('.log-text')].map((e) => e.textContent)).toEqual(['Fresh.']);
  });
});
