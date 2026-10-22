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

/** The log's print animation (main.css .log-entry): each line types in this long, and the next starts this much later. */
export const PRINT_SECONDS = 0.5;
export const PRINT_STAGGER = 0.12;
const PRINT_STEPS = 18;
/** One key click every few animation steps, and no more lines than this clicked through at once. */
const CLICK_EVERY = 3;
export const MAX_PRINTED_LINES = 4;

/** When each teletype click falls, in seconds from now, for `lines` lines printing together. */
export function printSchedule(lines: number): number[] {
  const out: number[] = [];
  const step = PRINT_SECONDS / PRINT_STEPS;
  for (let line = 0; line < Math.min(lines, MAX_PRINTED_LINES); line++) {
    for (let k = 0; k < PRINT_STEPS; k += CLICK_EVERY) out.push(line * PRINT_STAGGER + k * step);
  }
  return out;
}

export interface Hum {
  /** Base tone, Hz. */
  freq: number;
  /** A second tone this many Hz above, beating against the first; 0 for none. */
  beat: number;
  gain: number;
  type: OscillatorType;
  /** Swells per second in the volume; 0 for steady. */
  pulse: number;
}

const HUMS: readonly Hum[] = [
  { freq: 60, beat: 0, gain: 0.012, type: 'sine', pulse: 0 },
  { freq: 58, beat: 1.5, gain: 0.014, type: 'sine', pulse: 0 },
  { freq: 49, beat: 2.5, gain: 0.016, type: 'triangle', pulse: 0 },
  { freq: 41, beat: 3.2, gain: 0.02, type: 'sawtooth', pulse: 0.4 },
];

/** The ship's hum for an act: quiet and steady at first, lower and rougher as things go wrong. */
export const humFor = (act: number): Hum => HUMS[Math.max(1, Math.min(HUMS.length, act)) - 1]!;

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
export function createSound(): {
  play(cue: Cue, delay?: number): void;
  /** Key clicks for `lines` log lines printing together. */
  typewriter(lines: number): void;
  /** The ship's hum for this act; held until the act changes or sound is turned off. */
  setHum(act: number): void;
  setEnabled(on: boolean): void;
  unlock(): void;
} {
  let ctx: AudioContext | null = null;
  let enabled = false;
  let humAct = 0;
  let hum: { stop(): void } | null = null;

  function stopHum() {
    hum?.stop();
    hum = null;
  }

  function startHum() {
    stopHum();
    if (!enabled || !ctx || ctx.state !== 'running' || humAct === 0) return;
    const spec = humFor(humAct);
    const out = ctx.createGain();
    out.gain.value = spec.gain;
    out.connect(ctx.destination);
    const oscs = [spec.freq, ...(spec.beat > 0 ? [spec.freq + spec.beat] : [])].map((f) => {
      const o = ctx!.createOscillator();
      o.type = spec.type;
      o.frequency.value = f;
      o.connect(out);
      o.start();
      return o;
    });
    let lfo: OscillatorNode | null = null;
    if (spec.pulse > 0) {
      lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = spec.pulse;
      depth.gain.value = spec.gain * 0.6;
      lfo.connect(depth).connect(out.gain);
      lfo.start();
    }
    hum = {
      stop() {
        for (const o of oscs) o.stop();
        lfo?.stop();
        out.disconnect();
      },
    };
  }

  function unlock() {
    if (!enabled) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume().then(() => (hum ? undefined : startHum()));
    else if (!hum) startHum();
  }

  function play(cue: Cue, delay = 0) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    let at = ctx.currentTime + delay;
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
    typewriter(lines) {
      for (const at of printSchedule(lines)) play('teletype', at);
    },
    setHum(act) {
      if (act === humAct) return;
      humAct = act;
      startHum();
    },
    setEnabled(on) {
      const turnedOn = on && !enabled;
      enabled = on;
      if (turnedOn) unlock();
      if (!on) stopHum();
    },
  };
}
