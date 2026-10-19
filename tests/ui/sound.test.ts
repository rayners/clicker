import { describe, it, expect } from 'vitest';
import { cueForLog } from '../../src/ui/sound';

describe('sound cues', () => {
  it('gives each kind of log entry its own voice', () => {
    expect(cueForLog('sys')).toBe('teletype');
    expect(cueForLog('crew')).toBe('teletype');
    expect(cueForLog('corp')).toBe('chime');
    expect(cueForLog('anomaly')).toBe('drone');
  });
});
