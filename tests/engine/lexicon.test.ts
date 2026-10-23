import { describe, it, expect } from 'vitest';
import { interpolate, placeholders } from '../../src/engine/lexicon';

describe('lexicon', () => {
  it('lists the placeholders a text uses', () => {
    expect(placeholders('{scout} lost near {deepWork}. No fault.')).toEqual(['scout', 'deepWork']);
    expect(placeholders('nothing here')).toEqual([]);
  });

  it("fills placeholders from a scenario's lexicon", () => {
    expect(interpolate('{scout} TELEMETRY LOST.', { scout: 'DRONE SD-4/07' })).toBe('DRONE SD-4/07 TELEMETRY LOST.');
  });

  it('leaves unknown placeholders visible instead of hiding the gap', () => {
    expect(interpolate('{missing} here', {})).toBe('{missing} here');
  });
});
