/** A tiny WebAudio synth for every game: short voiced cues and a held hum per level, from a game's own palette. */
export interface Voice {
  type: OscillatorType;
  freq: number;
  endFreq?: number;
  duration: number;
  gain: number;
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

export interface Palette<C extends string> {
  voices: Record<C, Voice[]>;
  /** One hum per level (act, depth), quiet at first. */
  hums: readonly Hum[];
}

/** The hum for a level, clamped to the table (levels count from 1). */
export const humAt = (hums: readonly Hum[], level: number): Hum => hums[Math.max(1, Math.min(hums.length, level)) - 1]!;

/** Silent until enabled and unlocked by a user gesture (required on iOS). */
export function createSynth<C extends string>(palette: Palette<C>): {
  play(cue: C, delay?: number): void;
  /** Hold this level's hum until the level changes or sound is turned off; 0 for none. */
  setHum(level: number): void;
  setEnabled(on: boolean): void;
  unlock(): void;
} {
  let ctx: AudioContext | null = null;
  let enabled = false;
  let humLevel = 0;
  let hum: { stop(): void } | null = null;

  function stopHum() {
    hum?.stop();
    hum = null;
  }

  function startHum() {
    stopHum();
    if (!enabled || !ctx || ctx.state !== 'running' || humLevel === 0) return;
    const spec = humAt(palette.hums, humLevel);
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

  function play(cue: C, delay = 0) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    let at = ctx.currentTime + delay;
    for (const v of palette.voices[cue]) {
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
    setHum(level) {
      if (level === humLevel) return;
      humLevel = level;
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
