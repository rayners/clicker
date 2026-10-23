/**
 * Held ground: an ordered run of sections (rooms, decks, buildings, floors) taken at the frontier and kept only
 * while garrisoned. Shared by DEEP CONTRACT's security detachment and Elderdark's Keep. Pure; no game imports.
 * @module
 */

export interface SectionDef {
  id: string;
  name: string;
  /** Force needed to take it at the standard pace, and garrison needed to keep it. */
  threat: number;
  /** Control lost per second while wholly unguarded, at pressure 1. */
  reclaim: number;
}

/** How a section stands right now. */
export interface SectionState {
  /** 0 = lost, 1 = secured. */
  control: number;
  /** Force stationed here. */
  garrison: number;
  /** Taken (control reached 1) and not since lost; contested while control is below 1. */
  secured: boolean;
}

/** Seconds to secure a section with force exactly matching its threat. */
export const ASSAULT_SECONDS = 60;
/** Overwhelming force stops helping beyond this multiple of the threat. */
const MAX_FORCE_RATIO = 4;
/** A secured section slipping below this much control is lost, and the frontier falls back to it. */
export const LOST_BELOW = 0.5;

/** Every section lost and unguarded, ready for the first assault. */
export const createGround = (defs: readonly SectionDef[]): SectionState[] => defs.map(() => ({ control: 0, garrison: 0, secured: false }));

/** Whether a section is held. */
export const isSecured = (s: SectionState): boolean => s.secured;

/** Index of the first section not yet secured; the number of sections once all are. */
export function frontier(states: SectionState[]): number {
  const i = states.findIndex((s) => !isSecured(s));
  return i === -1 ? states.length : i;
}

/** How many sections are held. */
export const held = (states: SectionState[]): number => states.filter(isSecured).length;

/** The force tied up in garrisons, across every section. */
export const upkeep = (states: SectionState[]): number => states.reduce((sum, s) => sum + s.garrison, 0);

/** Push on the frontier. Exposure is the attackers' risk (seconds weighted by how outmatched they are). */
export function assault(
  states: SectionState[],
  defs: readonly SectionDef[],
  force: number,
  seconds: number,
): { states: SectionState[]; exposure: number } {
  const i = frontier(states);
  const def = defs[i];
  if (!def || force <= 0 || seconds <= 0) return { states, exposure: 0 };
  const ratio = Math.min(MAX_FORCE_RATIO, force / def.threat);
  const section = states[i]!;
  const control = Math.min(1, section.control + (ratio * seconds) / ASSAULT_SECONDS);
  const next = states.map((s, j) => (j === i ? { ...s, control, secured: control >= 1 } : s));
  return { states: next, exposure: seconds / ratio };
}

/** Station force on a section that has at least been entered. */
export function setGarrison(states: SectionState[], index: number, garrison: number): SectionState[] {
  const s = states[index];
  if (!s || s.control <= 0) return states;
  return states.map((x, j) => (j === index ? { ...x, garrison: Math.max(0, garrison) } : x));
}

/**
 * Unguarded ground slips back, in proportion to how short its garrison falls, faster under pressure. Fully
 * garrisoned contested ground is won back at the same pace. Secured ground slipping below the line is lost.
 * The frontier itself is left to the assault.
 */
export function tickGround(states: SectionState[], defs: readonly SectionDef[], dt: number, pressure: number): SectionState[] {
  const line = frontier(states);
  return states.map((s, i) => {
    const def = defs[i]!;
    // The frontier is the line of contact: the assault decides it, not the slow drift.
    if (s.control <= 0 || i === line) return s;
    const shortfall = Math.max(0, 1 - s.garrison / def.threat);
    if (shortfall === 0) {
      if (!s.secured || s.control >= 1) return s;
      return { ...s, control: Math.min(1, s.control + def.reclaim * dt) };
    }
    const control = Math.max(0, s.control - def.reclaim * pressure * shortfall * dt);
    return { ...s, control, secured: s.secured && control >= LOST_BELOW };
  });
}
