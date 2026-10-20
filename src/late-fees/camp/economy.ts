import { BOOKING_SECONDS, COUNSELORS, FEE_PER_THREAT, LIGHTS, ZONES, type CounselorDef, type LightDef } from '../../late-fees-data/camp';
import { CAMP_UPGRADES, type CampEffect } from '../../late-fees-data/camp-upgrades';
import { assault, frontier, isSecured, tickGround } from '../../shared/ground';
import { formatNumber } from '../../shared/format';
import { appendLog } from '../../shared/log';
import { killerPressure } from '../killers';
import type { CampRun as Run, EntryKind } from '../state';
import type { Signals } from '../kinds';

export const COST_GROWTH = 1.15;
export const LIGHT_COST_GROWTH = 1.2;
const SPLIT_STEPS = 10;
export const DEFAULT_PREP_SHARE = 8;
/** A day at camp: six minutes of daylight, then three of night. */
export const DAY_LENGTH = 540;
export const NIGHT_FROM = 360;
/** Light per second per point of staff doing prep work after dark; by day they need a quarter of it. */
const LIGHT_PER_STAFF = 1;
const DAYLIGHT = 0.25;
const TOWER_WATCH = 20;
const TOWER_LIGHT = 0.5;
/** Share of its staffing prep work keeps in the dark. */
const DARK_WORK = 0.25;
const BASE_WHISTLE = 1;
const TOWER_BASE_COST = 500;
const TOWER_COST_GROWTH = 1.6;
/** Share of a lost zone's campers who are never found, and what each lost zone does to the camp's name. */
const LOST_CAMPERS = 0.5;
const REPUTATION_HIT = 0.8;
const REPUTATION_RECOVERY_SECONDS = 900;
const REPUTATION_FLOOR = 0.4;
// Same curve as DEEP CONTRACT's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

interface Multipliers {
  whistle: number;
  autoWhistle: number;
  light: number;
  counselor: Record<string, number>;
  staff: number;
  fee: number;
  lightEfficiency: number;
  tower: number;
  head: boolean;
}

function applyEffect(r: Multipliers, e: CampEffect): void {
  switch (e.kind) {
    case 'whistleMultiplier':
      r.whistle *= e.value;
      break;
    case 'autoWhistle':
      r.autoWhistle += e.value;
      break;
    case 'lightMultiplier':
      r.light *= e.value;
      break;
    case 'counselorMultiplier':
      r.counselor[e.counselor] = (r.counselor[e.counselor] ?? 1) * e.value;
      break;
    case 'staffMultiplier':
      r.staff *= e.value;
      break;
    case 'feeMultiplier':
      r.fee *= e.value;
      break;
    case 'lightEfficiency':
      r.lightEfficiency *= e.value;
      break;
    case 'towerMultiplier':
      r.tower *= e.value;
      break;
    case 'headCounselor':
      r.head = true;
      break;
  }
}

function multipliers(r: Run): Multipliers {
  const m: Multipliers = {
    whistle: 1,
    autoWhistle: 0,
    light: 1,
    counselor: {},
    staff: 1,
    fee: r.config.productionMultiplier,
    lightEfficiency: 1,
    tower: 1,
    head: false,
  };
  for (const u of CAMP_UPGRADES) if (r.upgrades.includes(u.id)) applyEffect(m, u.effect);
  return m;
}

export const isNight = (r: Run): boolean => r.elapsed % DAY_LENGTH >= NIGHT_FROM;

// ---------- purchases ----------

export const counselorCost = (def: CounselorDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const lightCost = (def: LightDef, owned: number): number => Math.ceil(def.baseCost * LIGHT_COST_GROWTH ** owned);
export const towerCost = (r: Run): number => Math.ceil(TOWER_BASE_COST * TOWER_COST_GROWTH ** r.towers);

export function buyCounselor<R extends Run>(r: R, id: string): R {
  const def = COUNSELORS.find((c) => c.id === id);
  if (!def) return r;
  const owned = r.counselors[id] ?? 0;
  const cost = counselorCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, counselors: { ...r.counselors, [id]: owned + 1 } };
}

export function buyLight<R extends Run>(r: R, id: string): R {
  const def = LIGHTS.find((l) => l.id === id);
  if (!def) return r;
  const owned = r.lights[id] ?? 0;
  const cost = lightCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, lights: { ...r.lights, [id]: owned + 1 } };
}

export function buyTower<R extends Run>(r: R): R {
  const cost = towerCost(r);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, towers: r.towers + 1 };
}

export const isCounselorRevealed = (r: Run, index: number): boolean =>
  index === 0 || COUNSELORS.slice(index - 1).some((c) => (r.counselors[c.id] ?? 0) > 0);
export const isLightRevealed = (r: Run, index: number): boolean => index === 0 || LIGHTS.slice(index - 1).some((l) => (r.lights[l.id] ?? 0) > 0);

// ---------- staff, light and the split ----------

export function counselorForce(r: Run, def: CounselorDef): number {
  const m = multipliers(r);
  return def.force * (m.counselor[def.id] ?? 1) * m.staff;
}

export const staff = (r: Run): number => COUNSELORS.reduce((s, c) => s + (r.counselors[c.id] ?? 0) * counselorForce(r, c), 0);

export function lightSupply(r: Run): number {
  const mult = multipliers(r).light;
  return LIGHTS.reduce((s, l) => s + (r.lights[l.id] ?? 0) * l.rate * mult, 0);
}

export const isHeadCounselorActive = (r: Run): boolean => multipliers(r).head && !r.headOff;

export function toggleHeadCounselor<R extends Run>(r: R): R {
  if (!multipliers(r).head) return r;
  return { ...r, headOff: !r.headOff };
}

export function shiftSplit<R extends Run>(r: R, step: 1 | -1): R {
  const prepShare = Math.max(0, Math.min(SPLIT_STEPS, r.prepShare + step));
  return prepShare === r.prepShare ? r : { ...r, prepShare };
}

export const towerWatch = (r: Run): number => r.towers * TOWER_WATCH * multipliers(r).tower;

/** Watch needed to keep every open zone from going dark. */
export const watchNeeded = (r: Run): number => r.zones.reduce((s, z, i) => (isSecured(z) ? s + ZONES[i]!.threat : s), 0);

interface Roster {
  prepRaw: number;
  watch: number;
  demand: number;
  supplied: number;
}

function roster(r: Run): Roster {
  const total = staff(r);
  const need = watchNeeded(r);
  const towers = Math.min(towerWatch(r), need);
  const prepRaw = isHeadCounselorActive(r) ? Math.max(0, total - Math.max(0, need - towers)) : (total * r.prepShare) / SPLIT_STEPS;
  const working = frontier(r.zones) < ZONES.length ? prepRaw : 0;
  const hours = isNight(r) ? 1 : DAYLIGHT;
  const demand = ((working * LIGHT_PER_STAFF + towers * TOWER_LIGHT) * hours) / multipliers(r).lightEfficiency;
  const supplied = demand === 0 ? 1 : Math.min(1, lightSupply(r) / demand);
  return { prepRaw, watch: total - prepRaw + towers * supplied, demand, supplied };
}

export const lightDemand = (r: Run): number => roster(r).demand;

/** Staffing actually opening the next zone: in the dark it barely gets done. */
export function prepForce(r: Run): number {
  const ro = roster(r);
  return ro.prepRaw * (DARK_WORK + (1 - DARK_WORK) * ro.supplied);
}

export const watchForce = (r: Run): number => roster(r).watch;

/** Watch posted on each open zone, from the front gate outward. */
export function watches(r: Run): number[] {
  let pool = roster(r).watch;
  return r.zones.map((z, i) => {
    if (!isSecured(z) || pool <= 0) return 0;
    const posted = Math.min(pool, ZONES[i]!.threat);
    pool -= posted;
    return posted;
  });
}

// ---------- takings and the dark ----------

export function incomeRate(r: Run): number {
  const fee = multipliers(r).fee * (REPUTATION_FLOOR + (1 - REPUTATION_FLOOR) * r.reputation);
  return r.zones.reduce((s, z, i) => (isSecured(z) ? s + ZONES[i]!.threat * FEE_PER_THREAT * fee : s), 0);
}

export const whistlePower = (r: Run): number => BASE_WHISTLE * multipliers(r).whistle;
export const autoWhistleRate = (r: Run): number => multipliers(r).autoWhistle;

const log = <R extends Run>(r: R, kind: EntryKind, text: string) => appendLog<EntryKind, R>(r, kind, text);

/** Booking rushes for newly opened zones; campers lost with zones that go dark. */
function settle<R extends Run>(before: R, after: R): R {
  let r = after;
  const fee = multipliers(after).fee;
  for (let i = 0; i < ZONES.length; i++) {
    const was = before.zones[i]!;
    const now = r.zones[i]!;
    const def = ZONES[i]!;
    if (!isSecured(was) && isSecured(now) && i >= r.deepest) {
      const rush = def.threat * FEE_PER_THREAT * BOOKING_SECONDS * fee;
      r = { ...r, deepest: i + 1, cash: r.cash + rush, lifetimeCash: r.lifetimeCash + rush };
      r = log(r, 'news', `${def.name} OPEN FOR THE SEASON. BOOKINGS RUSH IN: $${formatNumber(rush)}.`);
    } else if (isSecured(was) && !isSecured(now)) {
      const lost = Math.max(1, Math.ceil(def.campers * LOST_CAMPERS));
      r = { ...r, bodyCount: r.bodyCount + lost, reputation: r.reputation * REPUTATION_HIT };
      r = log(r, 'kill', `${def.name} WENT DARK. ${lost} CAMPER${lost === 1 ? '' : 'S'} UNACCOUNTED FOR BY MORNING.`);
    }
  }
  return r;
}

function posted<R extends Run>(r: R): R {
  const w = watches(r);
  return { ...r, zones: r.zones.map((z, i) => ({ ...z, garrison: w[i]! })) };
}

/** The director blows the whistle: everyone pitches in at the frontier for a second. */
export function whistle<R extends Run>(r: R): R {
  const { states } = assault(r.zones, ZONES, whistlePower(r), 1);
  return settle(r, { ...r, zones: states });
}

export function tickCamp<R extends Run>(r: R, dt: number): R {
  const ready = posted(r);
  const pushing = prepForce(ready) + autoWhistleRate(ready) * whistlePower(ready);
  const opened = assault(ready.zones, ZONES, pushing, dt).states;
  const zones = tickGround(opened, ZONES, dt, killerPressure(r, campSignals(r)));
  const next = { ...ready, zones };
  const income = incomeRate(next) * dt;
  const reputation = Math.min(1, next.reputation + ((1 - next.reputation) * dt) / REPUTATION_RECOVERY_SECONDS);
  return settle(r, { ...next, reputation, cash: next.cash + income, lifetimeCash: next.lifetimeCash + income });
}

const DEEP_FROM = ZONES.findIndex((z) => z.deep);

/** What the camp tells the story and the killer. */
export function campSignals(r: Run): Signals {
  return { progress: progress(r), deep: r.deepest > DEEP_FROM, night: isNight(r) };
}

/** Camp progress on the shared story scale. */
export function progress(r: Run): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + r.lifetimeCash) ** PROGRESS_EXPONENT);
}

// ---------- the camp store ----------

export function isCampUpgradeUnlocked(r: Run, id: string): boolean {
  const u = CAMP_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.takings !== undefined && r.lifetimeCash < u.unlock.takings) return false;
  if (u.unlock.counselor && (r.counselors[u.unlock.counselor.id] ?? 0) < u.unlock.counselor.count) return false;
  if (u.unlock.towers !== undefined && r.towers < u.unlock.towers) return false;
  return true;
}

export function availableCampUpgrades(r: Run) {
  return CAMP_UPGRADES.filter((u) => !r.upgrades.includes(u.id) && isCampUpgradeUnlocked(r, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyCampUpgrade<R extends Run>(r: R, id: string): R {
  const u = CAMP_UPGRADES.find((x) => x.id === id);
  if (!u || r.upgrades.includes(id) || !isCampUpgradeUnlocked(r, id) || r.cash < u.cost) return r;
  return { ...r, cash: r.cash - u.cost, upgrades: [...r.upgrades, id] };
}
