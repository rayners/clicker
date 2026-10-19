import type { LogKind } from '../mission/log';

export type Cue = 'click' | 'teletype' | 'chime' | 'drone' | 'ping';

export function cueForLog(kind: LogKind): Cue {
  switch (kind) {
    case 'corp':
      return 'chime';
    case 'anomaly':
      return 'drone';
    default:
      return 'teletype';
  }
}

interface Voice {
  type: OscillatorType;
  freq: number;
  endFreq?: number;
  duration: number;
  gain: number;
}

const VOICES: Record<Cue, Voice[]> = {
  click: [{ type: 'square', freq: 180, endFreq: 90, duration: 0.04, gain: 0.04 }],
  teletype: [
    { type: 'square', freq: 1200, duration: 0.02, gain: 0.025 },
    { type: 'square', freq: 900, duration: 0.02, gain: 0.02 },
  ],
  chime: [
    { type: 'sine', freq: 880, duration: 0.25, gain: 0.05 },
    { type: 'sine', freq: 1320, duration: 0.4, gain: 0.04 },
  ],
  drone: [{ type: 'sawtooth', freq: 55, endFreq: 41, duration: 1.4, gain: 0.05 }],
  ping: [{ type: 'sine', freq: 1560, endFreq: 1500, duration: 0.18, gain: 0.05 }],
};

/** Tiny WebAudio synth. Silent until enabled and unlocked by a user gesture (required on iOS). */
export function createSound(): { play(cue: Cue): void; setEnabled(on: boolean): void; unlock(): void } {
  let ctx: AudioContext | null = null;
  let enabled = false;

  function unlock() {
    if (!enabled) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  function play(cue: Cue) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    let at = ctx.currentTime;
    for (const v of VOICES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.freq, at);
      if (v.endFreq) osc.frequency.exponentialRampToValueAtTime(v.endFreq, at + v.duration);
      gain.gain.setValueAtTime(v.gain, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + v.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + v.duration);
      at += v.duration * 0.6;
    }
  }

  return {
    play,
    unlock,
    setEnabled(on) {
      const turnedOn = on && !enabled;
      enabled = on;
      if (turnedOn) unlock();
    },
  };
}
