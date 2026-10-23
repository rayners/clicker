import { createSynth, type Hum, type Voice } from '../engine/ui/sound';
import type { Company } from '../forest/state';

/** Elderdark's sound: the counting-house and the wood. A quill, a bell for the dead, a sour chord, a bright one. */
export type ForestCue = 'forage' | 'lost' | 'turned' | 'fragment';

const VOICES: Record<ForestCue, Voice[]> = {
  forage: [{ type: 'triangle', freq: 2200, endFreq: 1700, duration: 0.05, gain: 0.02 }],
  lost: [{ type: 'sine', freq: 196, endFreq: 190, duration: 1.6, gain: 0.06 }],
  turned: [
    { type: 'triangle', freq: 233, duration: 0.6, gain: 0.04 },
    { type: 'triangle', freq: 247, duration: 0.9, gain: 0.04 },
  ],
  fragment: [
    { type: 'sine', freq: 784, duration: 0.5, gain: 0.04 },
    { type: 'sine', freq: 988, duration: 0.5, gain: 0.04 },
    { type: 'sine', freq: 1175, duration: 0.9, gain: 0.04 },
  ],
};

/** The wood under each act: a low drone that sinks and roughens as it wakes. */
export const FOREST_HUMS: readonly Hum[] = [
  { freq: 98, beat: 0, gain: 0.008, type: 'sine', pulse: 0 },
  { freq: 87, beat: 0.8, gain: 0.01, type: 'sine', pulse: 0.1 },
  { freq: 73, beat: 1.6, gain: 0.013, type: 'triangle', pulse: 0.2 },
  { freq: 55, beat: 2.4, gain: 0.017, type: 'sawtooth', pulse: 0.35 },
];

/** Which cues a change of state calls for; `foraged` when the player has just foraged by hand. */
export function soundCues(prev: Company, next: Company, foraged = false): ForestCue[] {
  const cues: ForestCue[] = [];
  if (foraged) cues.push('forage');
  if (next.lifetimeDead > prev.lifetimeDead) cues.push('lost');
  if (next.turned > prev.turned) cues.push('turned');
  if (next.keyFragments > prev.keyFragments) cues.push('fragment');
  return cues;
}

export const createForestSound = () => createSynth<ForestCue>({ voices: VOICES, hums: FOREST_HUMS });
