import { CREW } from '../data/crew';
import { randomInt } from '../shared/rng';
import { appendLog } from './log';
import type { MissionCore } from './state';

/** Lifetime credits before the cryo bay opens. Credits are common to every scenario. */
export const CRYO_UNLOCK_CREDITS = 500;
export const MAX_AWAKE = 3;
/** Seconds awake to go from rested to exhausted. */
export const FATIGUE_SECONDS = 20 * 60;
/** Seconds in cryo to recover fully. */
export const RECOVERY_SECONDS = 5 * 60;
const MAX_FATIGUE = 100;
/** Awake crew at or above this fatigue are worth warning about before they give out. */
export const TIRING_FATIGUE = 80;

export type CrewStatus = 'cryo' | 'awake' | 'lost';
export interface CrewMemberState {
  status: CrewStatus;
  fatigue: number;
}

export function createCrewState(): Record<string, CrewMemberState> {
  return Object.fromEntries(CREW.map((c) => [c.id, { status: 'cryo', fatigue: 0 }]));
}

export function isCrewUnlocked(m: MissionCore): boolean {
  return m.lifetimeCredits >= CRYO_UNLOCK_CREDITS;
}

export function maxAwake(m: MissionCore): number {
  return Math.min(CREW.length, MAX_AWAKE + m.config.extraLifeSupport);
}

export function awakeCount(m: MissionCore): number {
  return Object.values(m.crew).filter((c) => c.status === 'awake').length;
}

export function crewStatus(m: MissionCore, id: string): 'cryo' | 'awake' | 'exhausted' | 'lost' {
  const c = m.crew[id];
  if (!c || c.status === 'cryo') return 'cryo';
  if (c.status === 'lost') return 'lost';
  return c.fatigue >= MAX_FATIGUE ? 'exhausted' : 'awake';
}

/** Awake and not exhausted: their boost applies. */
export function isCrewEffective(m: MissionCore, id: string): boolean {
  return crewStatus(m, id) === 'awake';
}

export function wakeCrew<M extends MissionCore>(m: M, id: string): M {
  const def = CREW.find((c) => c.id === id);
  const member = m.crew[id];
  if (!def || !member || member.status !== 'cryo') return m;
  if (!isCrewUnlocked(m) || m.credits < def.thawCost || awakeCount(m) >= maxAwake(m)) return m;
  const [lineIndex, rng] = randomInt(m.rng, 0, def.wakeLines.length - 1);
  const woken: M = {
    ...m,
    rng,
    credits: m.credits - def.thawCost,
    crew: { ...m.crew, [id]: { ...member, status: 'awake' } },
  };
  return appendLog(woken, 'crew', `${def.callsign}: "${def.wakeLines[lineIndex]}"`);
}

export function sleepCrew<M extends MissionCore>(m: M, id: string): M {
  const member = m.crew[id];
  if (!member || member.status !== 'awake') return m;
  return { ...m, crew: { ...m.crew, [id]: { ...member, status: 'cryo' } } };
}

function fatigueMultiplier(m: MissionCore): number {
  return CREW.reduce((mult, c) => (c.fatigueRelief !== undefined && isCrewEffective(m, c.id) ? mult * c.fatigueRelief : mult), 1);
}

export function tickCrew<M extends MissionCore>(m: M, dt: number, strain = 1): M {
  const gain = (dt / FATIGUE_SECONDS) * MAX_FATIGUE * fatigueMultiplier(m) * strain;
  const loss = (dt / RECOVERY_SECONDS) * MAX_FATIGUE;
  let next: M = { ...m, crew: { ...m.crew } };
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

/** Crew the player should look at: exhausted (boost lost) and awake-but-tiring. */
export function crewNeedingAttention(m: MissionCore): { exhausted: string[]; tiring: string[] } {
  const exhausted: string[] = [];
  const tiring: string[] = [];
  for (const def of CREW) {
    const status = crewStatus(m, def.id);
    if (status === 'exhausted') exhausted.push(def.id);
    else if (status === 'awake' && (m.crew[def.id]?.fatigue ?? 0) >= TIRING_FATIGUE) tiring.push(def.id);
  }
  return { exhausted, tiring };
}
