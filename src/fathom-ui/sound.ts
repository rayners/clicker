import { createSynth, type Hum, type Voice } from '../engine/ui/sound';
import type { Outfit } from '../fathom/state';

/** DOWN THERE's sound: a sonar console. Pings, a thud for the lost, an alarm for landfall, and a hum that sinks. */
export type FathomCue = 'sonar' | 'pass' | 'taken' | 'landfall';

const VOICES: Record<FathomCue, Voice[]> = {
  sonar: [{ type: 'sine', freq: 1180, endFreq: 1120, duration: 0.6, gain: 0.03 }],
  pass: [{ type: 'triangle', freq: 660, endFreq: 880, duration: 0.06, gain: 0.03 }],
  taken: [{ type: 'sine', freq: 90, endFreq: 40, duration: 0.5, gain: 0.08 }],
  landfall: [
    { type: 'sawtooth', freq: 220, duration: 0.35, gain: 0.04 },
    { type: 'sawtooth', freq: 165, duration: 0.35, gain: 0.04 },
    { type: 'sawtooth', freq: 220, duration: 0.35, gain: 0.04 },
  ],
};

/** The water under the console, one per act: a soft swell, then deeper and less steady. */
export const FATHOM_HUMS: readonly Hum[] = [
  { freq: 70, beat: 0, gain: 0.01, type: 'sine', pulse: 0.15 },
  { freq: 55, beat: 1, gain: 0.012, type: 'sine', pulse: 0.2 },
  { freq: 44, beat: 2, gain: 0.015, type: 'triangle', pulse: 0.3 },
  { freq: 33, beat: 2.8, gain: 0.02, type: 'sawtooth', pulse: 0.5 },
];

/** Seconds between sonar pings while sound is on. */
export const SONAR_EVERY = 6;

/** Which cues a change of state calls for; `sold` when the player has just sold a pass by hand. */
export function soundCues(prev: Outfit, next: Outfit, sold = false): FathomCue[] {
  const cues: FathomCue[] = [];
  if (sold) cues.push('pass');
  if (next.bodyCount > prev.bodyCount) cues.push('taken');
  if (next.category > prev.category) cues.push('landfall');
  return cues;
}

export const createFathomSound = () => createSynth<FathomCue>({ voices: VOICES, hums: FATHOM_HUMS });
