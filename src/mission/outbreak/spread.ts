import { nextRandom } from '../../shared/rng';
import { CREW } from '../../data/crew';
import { crewStatus } from '../crew';
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
/** A named crew member turns for every tenth of the workforce turned. */
const CREW_PER_TURNED = 10;
/** The sick bay doors open: at least this much of the workforce comes out turned. */
const FIRST_TURNED = 0.02;
/** Wellness shortens a flu by this share per level. */
const WELLNESS_RECOVERY = 0.5;
/** Screening makes each tenth of quarantine this much more effective per level; contact never quite stops. */
const SCREENING_FOCUS = 0.5;
const MIN_CONTACT = 0.05;
/** Share of the workforce one ward holds, out of reach of turning. */
export const WARD_SIZE = 0.03;
/** Samples per second per culture tank, the infectiousness each tank adds, and the funding samples bring. */
const CULTURE_RATE = 0.01;
const CULTURE_SPREAD = 0.1;
const SAMPLE_FUNDING = 0.5;
/** Output while a section is sealed. */
const LOCKDOWN_OUTPUT = 0.5;
/** The officer's quarantine: a base, and more for each level of screening and each three wards to back it up. */
const OFFICER_BASE = 2;
const OFFICER_PER_SCREENING = 2;
const OFFICER_WARDS_PER_TENTH = 3;
const OFFICER_TRIGGER = 0.01;

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
  const working = Math.max(MIN_OUTPUT, 1 - OFF_SHIFT_COST * (m.sick + m.turned) - QUARANTINE_COST * m.quarantine);
  const funding = 1 + SAMPLE_FUNDING * Math.sqrt(Math.floor(m.samples));
  return working * funding * (m.lockdownFor > 0 ? LOCKDOWN_OUTPUT : 1);
}

/** What the Infection Control Officer sets the dial to: tight while it is going round, open when it is not. */
export function officerQuarantine(m: OutbreakMission): number {
  if (m.exposed + m.sick <= OFFICER_TRIGGER) return 0;
  return Math.min(MAX_QUARANTINE, OFFICER_BASE + OFFICER_PER_SCREENING * m.screening + Math.floor(m.wards / OFFICER_WARDS_PER_TENTH));
}

export const outbreakPressure = (m: OutbreakMission): number => 1 + TURNED_PRESSURE * m.turned;

export function shiftQuarantine<M extends OutbreakMission>(m: M, step: 1 | -1): M {
  const quarantine = Math.max(0, Math.min(MAX_QUARANTINE, m.quarantine + step));
  return quarantine === m.quarantine ? m : { ...m, quarantine };
}

/** Act IV opens with the first of the turned walking out of the sick bay, whatever quarantine managed. */
export function firstTurned<M extends OutbreakMission>(m: M): M {
  return m.turned >= FIRST_TURNED ? m : { ...m, turned: FIRST_TURNED };
}

/** Named crew turn as the turned spread: whoever is awake first, then whoever is left in cryo. */
function turnCrew<M extends OutbreakMission>(m: M): M {
  const target = Math.min(CREW.length, Math.floor(m.turned * CREW_PER_TURNED));
  let next = m;
  while (next.crewTurned < target) {
    const living = CREW.filter((c) => crewStatus(next, c.id) !== 'lost');
    const victim = living.find((c) => next.crew[c.id]?.status === 'awake') ?? living[0];
    if (!victim) return { ...next, crewTurned: target };
    const member = next.crew[victim.id]!;
    next = appendLog(
      { ...next, crewTurned: next.crewTurned + 1, crew: { ...next.crew, [victim.id]: { ...member, status: 'lost' } } },
      'anomaly',
      `${victim.callsign} HAS TURNED. THE BADGE STILL WORKS. WARDEN HAS NOT REVOKED IT.`,
    );
  }
  return next;
}

export function tickOutbreak<M extends OutbreakMission>(m: M, dt: number, hooks: HorrorHooks): M {
  if (m.act < 2) return m;
  if (m.officer) m = { ...m, quarantine: officerQuarantine(m) };
  const isolation = Math.min(1 - MIN_CONTACT, QUARANTINE_CUT * m.quarantine * (1 + SCREENING_FOCUS * m.screening));
  const contact = CONTACT * (1 - isolation) * (1 + CULTURE_SPREAD * m.cultures);
  // The turned are infectious too: act IV keeps spreading even once quarantine has emptied the sick bay.
  const infected = Math.min(healthy(m), contact * healthy(m) * (m.exposed + m.sick + m.turned) * dt);
  const showing = (m.exposed * dt) / INCUBATION;
  // Before the discovery it is a flu: the sick get better. After it, they stop coming back; in act IV they turn.
  const better = m.act < 3 ? (m.sick * dt * (1 + WELLNESS_RECOVERY * m.wellness)) / RECOVERY : 0;
  // The sick on ward beds do not turn.
  const turning = m.act >= 4 ? (Math.max(0, m.sick - m.wards * WARD_SIZE) * dt) / TURNING : 0;
  let next: M = {
    ...m,
    exposed: Math.max(m.act < 3 ? ENDEMIC : 0, m.exposed + infected - showing),
    sick: m.sick + showing - better - turning,
    recovered: m.recovered + better,
    turned: m.turned + turning,
    samples: m.samples + m.cultures * CULTURE_RATE * dt,
    lockdownFor: Math.max(0, m.lockdownFor - dt),
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
  return next.act >= 4 ? turnCrew(next) : next;
}
