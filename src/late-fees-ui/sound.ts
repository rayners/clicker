import { createSynth, type Hum, type Voice } from '../shared/ui/sound';
import type { Run } from '../late-fees/state';

/** LATE FEES's sound: a tape deck and an analogue synth score. Clicks, stabs, swells, and a bass line that tightens. */
export type LateCue = 'press' | 'kill' | 'act' | 'credits';

const VOICES: Record<LateCue, Voice[]> = {
  press: [{ type: 'square', freq: 320, endFreq: 240, duration: 0.03, gain: 0.03 }],
  kill: [
    { type: 'sawtooth', freq: 740, endFreq: 698, duration: 0.18, gain: 0.05 },
    { type: 'sawtooth', freq: 1047, endFreq: 988, duration: 0.3, gain: 0.04 },
  ],
  act: [{ type: 'sawtooth', freq: 110, endFreq: 82, duration: 1.2, gain: 0.05 }],
  credits: [
    { type: 'triangle', freq: 523, duration: 0.4, gain: 0.04 },
    { type: 'triangle', freq: 440, duration: 0.4, gain: 0.04 },
    { type: 'triangle', freq: 349, duration: 0.8, gain: 0.04 },
  ],
};

/** The score under each act: a slow pulse that quickens and drops as the killer closes in. */
export const LATE_HUMS: readonly Hum[] = [
  { freq: 82, beat: 0, gain: 0.01, type: 'triangle', pulse: 0.5 },
  { freq: 73, beat: 0, gain: 0.012, type: 'triangle', pulse: 1 },
  { freq: 65, beat: 1, gain: 0.014, type: 'sawtooth', pulse: 2 },
  { freq: 55, beat: 1.5, gain: 0.018, type: 'sawtooth', pulse: 3 },
];

/** Which cues a change of state calls for; `pressed` when the player has just used the big button. */
export function soundCues(prev: Run, next: Run, pressed = false): LateCue[] {
  const cues: LateCue[] = [];
  if (pressed) cues.push('press');
  if (next.bodyCount > prev.bodyCount) cues.push('kill');
  if (next.act > prev.act) cues.push('act');
  if (next.flags.includes('terminus') && !prev.flags.includes('terminus')) cues.push('credits');
  return cues;
}

export const createLateSound = () => createSynth<LateCue>({ voices: VOICES, hums: LATE_HUMS });
