import { nextRandom } from '../../shared/rng';
import { CREW } from '../../data/crew';
import { COUNTER_DIRECTIVE } from '../../data/core-story';
import { crewStatus } from '../crew';
import { appendLog, type LogKind } from '../log';
import type { OrganismMission as MissionState } from '../state';
import type { HorrorHooks } from '../kinds';

export const RIG_BASE_COST = 1e6;
const RIG_COST_GROWTH = 1.8;
/** Specimens per second per recovery rig. */
export const RIG_RATE = 0.01;
/** Funding grows with the square root of specimens held, so hoarding has diminishing returns. */
const FUNDING_SCALE = 0.5;
/** Integrity percentage points lost per second per held specimen, before containment levels. */
const STRAIN_PER_SPECIMEN = 0.015;
export const REINFORCE_AMOUNT = 25;
const REINFORCE_BASE_COST = 2e5;
const CONTAINMENT_BASE_COST = 5e6;
const CONTAINMENT_COST_GROWTH = 3;
const BREACH_ESCAPE_FRACTION = 0.3;
export const BREACH_RESET_INTEGRITY = 60;
/** Chance per loose contact per second of an incident. */
const INCIDENT_CHANCE = 0.0008;
const VENT_BASE_COST = 2e6;
const VENT_COST_GROWTH = 2;
const LOOSE_PRESSURE = 1;
const CONTACT_PRESSURE = 0.5;
const VENT_CONTACT_SURVIVAL = 0.4;
const VENT_CREW_LOSS = 0.3;

export function isSpecialProjectsUnlocked(m: MissionState): boolean {
  return m.flags.includes('specimens');
}

export function rigCost(m: MissionState): number {
  return Math.ceil(RIG_BASE_COST * RIG_COST_GROWTH ** m.rigs);
}

export function buyRig<M extends MissionState>(m: M): M {
  const cost = rigCost(m);
  if (!isSpecialProjectsUnlocked(m) || m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, rigs: m.rigs + 1 };
}

export function fundingMultiplier(m: MissionState): number {
  return 1 + FUNDING_SCALE * Math.sqrt(Math.floor(m.specimens));
}

export function containmentLevelCost(m: MissionState): number {
  return CONTAINMENT_BASE_COST * CONTAINMENT_COST_GROWTH ** m.containmentLevel;
}

export function buyContainmentLevel<M extends MissionState>(m: M): M {
  const cost = containmentLevelCost(m);
  if (!isSpecialProjectsUnlocked(m) || m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, containmentLevel: m.containmentLevel + 1 };
}

export function reinforceCost(m: MissionState): number {
  return REINFORCE_BASE_COST * (1 + Math.floor(m.specimens));
}

export function reinforce<M extends MissionState>(m: M): M {
  const cost = reinforceCost(m);
  if (m.integrity >= 100 || m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, integrity: Math.min(100, m.integrity + REINFORCE_AMOUNT) };
}

/** Something loose takes ground back: once it is out (act 4), and more for every contact still aboard. */
export function organismPressure(m: MissionState): number {
  return 1 + (m.act >= 4 ? LOOSE_PRESSURE : 0) + m.contacts * CONTACT_PRESSURE;
}

export function strainRate(m: MissionState): number {
  return (Math.floor(m.specimens) * STRAIN_PER_SPECIMEN) / (1 + m.containmentLevel);
}

export function breach<M extends MissionState>(m: M): M {
  const held = Math.floor(m.specimens);
  const escaped = held === 0 ? 0 : Math.max(1, Math.round(held * BREACH_ESCAPE_FRACTION));
  const next: M = {
    ...m,
    specimens: m.specimens - escaped,
    contacts: m.contacts + escaped,
    integrity: BREACH_RESET_INTEGRITY,
    breaches: m.breaches + 1,
  };
  return appendLog(next, 'anomaly', `CONTAINMENT BREACH. ${escaped} SPECIMEN${escaped === 1 ? '' : 'S'} UNACCOUNTED FOR. SEALING BULKHEADS.`);
}

type Roll = () => number;

function roller(m: MissionState): { roll: Roll; state: () => number } {
  let state = m.rng;
  return {
    roll: () => {
      const [value, next] = nextRandom(state);
      state = next;
      return value;
    },
    state: () => state,
  };
}

function pick<T>(items: readonly T[], roll: Roll): T {
  return items[Math.floor(roll() * items.length)]!;
}

const EQUIPMENT_LINES = [
  (name: string) => `${name} SIGNAL LOST. LAST TELEMETRY: [CORRUPTED].`,
  (name: string) => `${name} OFFLINE. CAMERA FEED SHOWS MOVEMENT. CAMERA FEED LOST.`,
  (name: string) => `${name} REPORTS HULL BREACH FROM INSIDE. UNIT UNRESPONSIVE.`,
];

const CREW_LINES = [
  (name: string) => `BIOMONITOR: ${name} — NO SIGNAL.`,
  (name: string) => `${name} LAST SEEN CORRIDOR C. MOTION TRACKER: 2 CONTACTS. NOW 1.`,
  (name: string) => `CRYO POD OPENED FROM OUTSIDE. ${name} NOT IN POD.`,
];

function lose<M extends MissionState>(m: M, id: string): M {
  const member = m.crew[id];
  if (!member) return m;
  return { ...m, crew: { ...m.crew, [id]: { ...member, status: 'lost' } } };
}

/** Counter-directive 0-78 is filed: WARDEN keeps the crew out of harm's way, and specimens come second. */
const crewFirst = (m: MissionState) => m.flags.includes(COUNTER_DIRECTIVE);
/** Recovery under 0-78: the rigs wait while anyone is in the way. */
const CREW_FIRST_RECOVERY = 0.5;

function incident<M extends MissionState>(m: M, roll: Roll, hooks: HorrorHooks): M {
  const kind = roll();
  const awake = CREW.filter((c) => m.crew[c.id]?.status === 'awake');
  const living = CREW.filter((c) => crewStatus(m, c.id) !== 'lost');
  const log = (next: M, kindOf: LogKind, text: string) => appendLog(next, kindOf, text);

  if (kind < 0.5) {
    const lost = hooks.loseEquipment(m, roll);
    if (lost) return log(lost.m as M, 'sys', pick(EQUIPMENT_LINES, roll)(lost.name));
  }
  if (kind < 0.8 && living.length > 0 && !crewFirst(m)) {
    const victim = pick(awake.length > 0 ? awake : living, roll);
    return log(lose(m, victim.id), 'anomaly', pick(CREW_LINES, roll)(victim.callsign));
  }
  return log({ ...m, integrity: Math.max(0, m.integrity - 15) }, 'sys', 'CONTAINMENT HOUSING STRUCK FROM OUTSIDE. INTEGRITY -15%.');
}

export function tickContainment<M extends MissionState>(m: M, dt: number, hooks: HorrorHooks): M {
  if (!isSpecialProjectsUnlocked(m) && m.contacts === 0) return m;
  const recovered = m.rigs * RIG_RATE * dt * (crewFirst(m) ? CREW_FIRST_RECOVERY : 1);
  let next: M = {
    ...m,
    specimens: m.specimens + recovered,
    specimensRecovered: m.specimensRecovered + recovered,
    integrity: m.integrity - strainRate(m) * dt,
  };
  if (next.integrity <= 0) next = breach(next);

  if (next.contacts > 0) {
    const r = roller(next);
    const chance = 1 - (1 - INCIDENT_CHANCE * next.config.incidentMultiplier) ** (next.contacts * dt);
    if (r.roll() < chance) next = incident(next, r.roll, hooks);
    next = { ...next, rng: r.state() };
  }
  return next;
}

export function ventCost(m: MissionState): number {
  return VENT_BASE_COST * VENT_COST_GROWTH ** m.vents;
}

export function vent<M extends MissionState>(m: M): M {
  const cost = ventCost(m);
  if (m.contacts === 0 || m.credits < cost) return m;
  const r = roller(m);
  let survivors = 0;
  for (let i = 0; i < m.contacts; i++) if (r.roll() < VENT_CONTACT_SURVIVAL) survivors++;
  let next: M = { ...m, credits: m.credits - cost, vents: m.vents + 1, contacts: survivors };
  // Under 0-78 WARDEN clears the decks before it opens them.
  const victims = crewFirst(m) ? [] : CREW.filter((c) => m.crew[c.id]?.status === 'awake' && r.roll() < VENT_CREW_LOSS);
  for (const v of victims) next = lose(next, v.id);
  next = { ...next, rng: r.state() };
  next = appendLog(next, 'sys', `DECKS VENTED TO VACUUM. MOTION TRACKER: ${m.contacts} CONTACTS -> ${survivors}.`);
  for (const v of victims) next = appendLog(next, 'anomaly', `${v.callsign} WAS ON A VENTED DECK.`);
  return next;
}
