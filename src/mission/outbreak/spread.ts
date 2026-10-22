import { nextRandom } from '../../shared/rng';
import type { HorrorHooks } from '../kinds';
import { appendLog } from '../log';
import type { OutbreakMission } from '../state';

export const MAX_QUARANTINE = 10;
/** Contact rate between the infectious and the healthy, per second. */
const CONTACT = 1 / 400;
/** Share of contact each tenth of quarantine cuts. */
const QUARANTINE_CUT = 0.08;
/** Seconds to show symptoms, to get better (while it is a flu), and to turn (act IV). */
const INCUBATION = 300;
const RECOVERY = 240;
const TURNING = 400;
/** Once it is going round, it never quite goes away. */
const ENDEMIC = 0.002;
/** Output lost per share of the workforce off shift, and per tenth isolated. */
const OFF_SHIFT_COST = 0.6;
const QUARANTINE_COST = 0.03;
const MIN_OUTPUT = 0.2;
/** Extra pushback on held ground per share turned. */
const TURNED_PRESSURE = 3;
/** Chance per second of sabotage, per share turned. */
const SABOTAGE = 0.02;

const SABOTAGE_LINES = [
  (name: string) => `${name} WRECKED OVERNIGHT. THE ACCESS LOG SHOWS A STAFF BADGE. THE BADGE'S OWNER WAS SIGNED OFF SICK A WEEK AGO.`,
  (name: string) => `${name} STRIPPED AND LEFT RUNNING DRY. WHOEVER DID IT KNEW EXACTLY WHICH VALVE.`,
];

export const healthy = (m: OutbreakMission): number => Math.max(0, 1 - m.exposed - m.sick - m.turned - m.recovered);

/** Share of the workforce not working: the sick, the turned and those isolated in quarantine. */
export function offShift(m: OutbreakMission): number {
  return Math.min(1, m.sick + m.turned + (m.quarantine / MAX_QUARANTINE) * healthy(m));
}

export function outbreakProduction(m: OutbreakMission): number {
  return Math.max(MIN_OUTPUT, 1 - OFF_SHIFT_COST * (m.sick + m.turned) - QUARANTINE_COST * m.quarantine);
}

export const outbreakPressure = (m: OutbreakMission): number => 1 + TURNED_PRESSURE * m.turned;

export function shiftQuarantine<M extends OutbreakMission>(m: M, step: 1 | -1): M {
  const quarantine = Math.max(0, Math.min(MAX_QUARANTINE, m.quarantine + step));
  return quarantine === m.quarantine ? m : { ...m, quarantine };
}

export function tickOutbreak<M extends OutbreakMission>(m: M, dt: number, hooks: HorrorHooks): M {
  if (m.act < 2) return m;
  const contact = CONTACT * (1 - QUARANTINE_CUT * m.quarantine);
  const infected = Math.min(healthy(m), contact * healthy(m) * (m.exposed + m.sick) * dt);
  const showing = (m.exposed * dt) / INCUBATION;
  // Before the discovery it is a flu: the sick get better. After it, they stop coming back; in act IV they turn.
  const better = m.act < 3 ? (m.sick * dt) / RECOVERY : 0;
  const turning = m.act >= 4 ? (m.sick * dt) / TURNING : 0;
  let next: M = {
    ...m,
    exposed: Math.max(m.act < 3 ? ENDEMIC : 0, m.exposed + infected - showing),
    sick: m.sick + showing - better - turning,
    recovered: m.recovered + better,
    turned: m.turned + turning,
  };
  if (next.turned > 0) {
    let rng = next.rng;
    const roll = () => {
      const [v, s] = nextRandom(rng);
      rng = s;
      return v;
    };
    if (roll() < SABOTAGE * next.turned * next.config.incidentMultiplier * dt) {
      const lost = hooks.loseEquipment(next, roll);
      if (lost) {
        const line = SABOTAGE_LINES[Math.floor(roll() * SABOTAGE_LINES.length)]!;
        next = appendLog(lost.m as M, 'anomaly', line(lost.name));
      }
    }
    next = { ...next, rng };
  }
  return next;
}
