import type { LogKind } from '../mission/log';
import { createSynth, humAt, type Hum, type Voice } from '../shared/ui/sound';

export type { Hum } from '../shared/ui/sound';

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

const HUMS: readonly Hum[] = [
  { freq: 60, beat: 0, gain: 0.012, type: 'sine', pulse: 0 },
  { freq: 58, beat: 1.5, gain: 0.014, type: 'sine', pulse: 0 },
  { freq: 49, beat: 2.5, gain: 0.016, type: 'triangle', pulse: 0 },
  { freq: 41, beat: 3.2, gain: 0.02, type: 'sawtooth', pulse: 0.4 },
];

/** The ship's hum for an act: quiet and steady at first, lower and rougher as things go wrong. */
export const humFor = (act: number): Hum => humAt(HUMS, act);

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

/** DEEP CONTRACT's sound: the shared synth with WARDEN's voices, plus key clicks timed to the log printing. */
export function createSound() {
  const synth = createSynth<Cue>({ voices: VOICES, hums: HUMS });
  return {
    ...synth,
    /** Key clicks for `lines` log lines printing together. */
    typewriter(lines: number) {
      for (const at of printSchedule(lines)) synth.play('teletype', at);
    },
  };
}
