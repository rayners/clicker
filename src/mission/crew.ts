import { CREW } from '../data/crew';
import { randomInt } from '../core/rng';
import { appendLog } from './log';
import type { MissionState } from './state';

export const CRYO_UNLOCK_ORE = 500;
export const MAX_AWAKE = 3;
/** Seconds awake to go from rested to exhausted. */
export const FATIGUE_SECONDS = 20 * 60;
/** Seconds in cryo to recover fully. */
export const RECOVERY_SECONDS = 5 * 60;
const MAX_FATIGUE = 100;

export type CrewStatus = 'cryo' | 'awake' | 'lost';
export interface CrewMemberState {
  status: CrewStatus;
  fatigue: number;
}

export function createCrewState(): Record<string, CrewMemberState> {
  return Object.fromEntries(CREW.map((c) => [c.id, { status: 'cryo', fatigue: 0 }]));
}

export function isCrewUnlocked(m: MissionState): boolean {
  return m.lifetimeOre >= CRYO_UNLOCK_ORE;
}

export function awakeCount(m: MissionState): number {
  return Object.values(m.crew).filter((c) => c.status === 'awake').length;
}

export function crewStatus(m: MissionState, id: string): 'cryo' | 'awake' | 'exhausted' | 'lost' {
  const c = m.crew[id];
  if (!c || c.status === 'cryo') return 'cryo';
  if (c.status === 'lost') return 'lost';
  return c.fatigue >= MAX_FATIGUE ? 'exhausted' : 'awake';
}

/** Awake and not exhausted: their boost applies. */
export function isCrewEffective(m: MissionState, id: string): boolean {
  return crewStatus(m, id) === 'awake';
}

export function wakeCrew(m: MissionState, id: string): MissionState {
  const def = CREW.find((c) => c.id === id);
  const member = m.crew[id];
  if (!def || !member || member.status !== 'cryo') return m;
  if (!isCrewUnlocked(m) || m.credits < def.thawCost || awakeCount(m) >= MAX_AWAKE) return m;
  const [lineIndex, rng] = randomInt(m.rng, 0, def.wakeLines.length - 1);
  const woken: MissionState = {
    ...m,
    rng,
    credits: m.credits - def.thawCost,
    crew: { ...m.crew, [id]: { ...member, status: 'awake' } },
  };
  return appendLog(woken, 'crew', `${def.callsign}: "${def.wakeLines[lineIndex]}"`);
}

export function sleepCrew(m: MissionState, id: string): MissionState {
  const member = m.crew[id];
  if (!member || member.status !== 'awake') return m;
  return { ...m, crew: { ...m.crew, [id]: { ...member, status: 'cryo' } } };
}

function fatigueMultiplier(m: MissionState): number {
  return CREW.reduce(
    (mult, c) => (c.boost.kind === 'fatigueMultiplier' && isCrewEffective(m, c.id) ? mult * c.boost.value : mult),
    1,
  );
}

export function tickCrew(m: MissionState, dt: number): MissionState {
  const gain = (dt / FATIGUE_SECONDS) * MAX_FATIGUE * fatigueMultiplier(m);
  const loss = (dt / RECOVERY_SECONDS) * MAX_FATIGUE;
  let next: MissionState = { ...m, crew: { ...m.crew } };
  for (const def of CREW) {
    const c = m.crew[def.id];
    if (!c) continue;
    if (c.status === 'awake') {
      const fatigue = Math.min(MAX_FATIGUE, c.fatigue + gain);
      next.crew[def.id] = { ...c, fatigue };
      if (c.fatigue < MAX_FATIGUE && fatigue >= MAX_FATIGUE) {
        next = appendLog(next, 'crew', `${def.callsign}: "${def.exhaustedLine}"`);
      }
    } else if (c.status === 'cryo' && c.fatigue > 0) {
      next.crew[def.id] = { ...c, fatigue: Math.max(0, c.fatigue - loss) };
    }
  }
  return next;
}
