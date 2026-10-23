// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createSynth, humAt, type Hum, type Voice } from '../../src/engine/ui/sound';

/** A stand-in AudioContext that records what was started and stopped. */
const started: number[] = [];
const stopped: number[] = [];
class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  connect(n: unknown) {
    return n;
  }
  disconnect() {}
}
class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start() {
    started.push(this.frequency.value);
  }
  stop() {
    stopped.push(1);
  }
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeContext {
  state = 'running';
  currentTime = 0;
  destination = new FakeNode();
  createOscillator() {
    return new FakeOsc();
  }
  createGain() {
    return new FakeGain();
  }
  resume() {
    return Promise.resolve();
  }
}

const VOICES: Record<'blip', Voice[]> = { blip: [{ type: 'sine', freq: 440, duration: 0.1, gain: 0.05 }, { type: 'sine', freq: 660, duration: 0.1, gain: 0.05 }] };
const HUMS: Hum[] = [
  { freq: 60, beat: 0, gain: 0.01, type: 'sine', pulse: 0 },
  { freq: 50, beat: 2, gain: 0.01, type: 'sine', pulse: 0 },
];

beforeEach(() => {
  started.length = 0;
  stopped.length = 0;
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
});

describe('the shared synth', () => {
  it('stays silent until sound is turned on', () => {
    const synth = createSynth({ voices: VOICES, hums: HUMS });
    synth.play('blip');
    expect(started).toEqual([]);
    synth.setEnabled(true);
    synth.play('blip');
    expect(started.length).toBe(2);
  });

  it('holds a hum for the current level, swaps it when the level changes, and stops it when sound goes off', () => {
    const synth = createSynth({ voices: VOICES, hums: HUMS });
    synth.setEnabled(true);
    synth.setHum(1);
    expect(started).toEqual([60]);
    synth.setHum(2);
    expect(started.slice(1)).toEqual([50, 52]);
    synth.setEnabled(false);
    expect(stopped.length).toBe(3);
  });

  it('picks the hum for a level, clamped to the table', () => {
    expect(humAt(HUMS, 0)).toBe(HUMS[0]);
    expect(humAt(HUMS, 9)).toBe(HUMS[1]);
  });
});
