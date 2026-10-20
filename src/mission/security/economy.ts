import {
  BOUNTY_SECONDS,
  FABRICATORS,
  RETAINER_PER_THREAT,
  SECTIONS,
  TROOPERS,
  type FabricatorDef,
  type TrooperDef,
} from '../../data/security/systems';
import { SECURITY_UPGRADES, type SecurityEffect } from '../../data/security/upgrades';
import { SECURITY_CREW_BOOSTS } from '../../data/security/crew-boosts';
import { assault, frontier, isSecured, tickGround, type SectionState } from '../../shared/ground';
import { formatNumber } from '../../shared/format';
import { isCrewEffective } from '../crew';
import { horrorPressure, horrorProductionMultiplier } from '../horrors';
import { appendLog } from '../log';
import type { SecurityMission as MissionState } from '../state';

export const COST_GROWTH = 1.15;
/** Ammunition is the brake (as power is for terraforming): fabricators get dearer faster than troopers. */
export const FABRICATOR_COST_GROWTH = 1.2;
const SPLIT_STEPS = 10;
export const DEFAULT_ASSAULT_SHARE = 8;
/** Rounds per second per point of force in the assault. */
const AMMO_PER_FORCE = 1;
/** Holding force per sentry gun, before upgrades, and the rounds per second each point of it burns. */
const SENTRY_HOLD = 20;
const SENTRY_AMMO_PER_HOLD = 0.5;
/** Share of its force an assault keeps with empty magazines. */
const DRY_FORCE = 0.25;
const BASE_SUPPORT = 1;
const SENTRY_BASE_COST = 500;
const SENTRY_COST_GROWTH = 1.6;
// Same curve as extraction's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

interface Multipliers {
  support: number;
  autoSupport: number;
  fabricator: number;
  trooper: Record<string, number>;
  force: number;
  retainer: number;
  ammoEfficiency: number;
  sentry: number;
  tacticalNet: boolean;
}

function applyEffect(r: Multipliers, e: SecurityEffect): void {
  switch (e.kind) {
    case 'supportMultiplier':
      r.support *= e.value;
      break;
    case 'autoSupport':
      r.autoSupport += e.value;
      break;
    case 'fabricatorMultiplier':
      r.fabricator *= e.value;
      break;
    case 'trooperMultiplier':
      r.trooper[e.trooper] = (r.trooper[e.trooper] ?? 1) * e.value;
      break;
    case 'forceMultiplier':
      r.force *= e.value;
      break;
    case 'retainerMultiplier':
      r.retainer *= e.value;
      break;
    case 'ammoEfficiency':
      r.ammoEfficiency *= e.value;
      break;
    case 'sentryMultiplier':
      r.sentry *= e.value;
      break;
    case 'tacticalNet':
      r.tacticalNet = true;
      break;
  }
}

function multipliers(m: MissionState): Multipliers {
  const r: Multipliers = {
    support: 1,
    autoSupport: 0,
    fabricator: 1,
    trooper: {},
    force: 1,
    retainer: horrorProductionMultiplier(m) * m.config.productionMultiplier,
    ammoEfficiency: 1,
    sentry: 1,
    tacticalNet: false,
  };
  for (const u of SECURITY_UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(r, u.effect);
  for (const [id, boost] of Object.entries(SECURITY_CREW_BOOSTS)) if (isCrewEffective(m, id)) applyEffect(r, boost.effect);
  return r;
}

// ---------- purchases ----------

export const trooperCost = (def: TrooperDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const fabricatorCost = (def: FabricatorDef, owned: number): number => Math.ceil(def.baseCost * FABRICATOR_COST_GROWTH ** owned);
export const sentryCost = (m: MissionState): number => Math.ceil(SENTRY_BASE_COST * SENTRY_COST_GROWTH ** m.sentries);

export function buyTrooper<M extends MissionState>(m: M, id: string): M {
  const def = TROOPERS.find((t) => t.id === id);
  if (!def) return m;
  const owned = m.troopers[id] ?? 0;
  const cost = trooperCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, troopers: { ...m.troopers, [id]: owned + 1 } };
}

export function buyFabricator<M extends MissionState>(m: M, id: string): M {
  const def = FABRICATORS.find((f) => f.id === id);
  if (!def) return m;
  const owned = m.fabricators[id] ?? 0;
  const cost = fabricatorCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, fabricators: { ...m.fabricators, [id]: owned + 1 } };
}

export function buySentry<M extends MissionState>(m: M): M {
  const cost = sentryCost(m);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, sentries: m.sentries + 1 };
}

/** The first tier is always visible; each further one once the one before it is owned. */
export function isTrooperRevealed(m: MissionState, index: number): boolean {
  return index === 0 || TROOPERS.slice(index - 1).some((t) => (m.troopers[t.id] ?? 0) > 0);
}

export function isFabricatorRevealed(m: MissionState, index: number): boolean {
  return index === 0 || FABRICATORS.slice(index - 1).some((f) => (m.fabricators[f.id] ?? 0) > 0);
}

// ---------- force, ammunition and the split ----------

export function trooperForce(m: MissionState, def: TrooperDef): number {
  const mult = multipliers(m);
  return def.force * (mult.trooper[def.id] ?? 1) * mult.force;
}

export function force(m: MissionState): number {
  return TROOPERS.reduce((s, t) => s + (m.troopers[t.id] ?? 0) * trooperForce(m, t), 0);
}

export function ammoSupply(m: MissionState): number {
  const mult = multipliers(m).fabricator;
  return FABRICATORS.reduce((s, f) => s + (m.fabricators[f.id] ?? 0) * f.rate * mult, 0);
}

export function isTacticalNetActive(m: MissionState): boolean {
  return multipliers(m).tacticalNet && !m.netOff;
}

/** Take the split back from WARDEN, or hand it over again. Only once the net is installed. */
export function toggleTacticalNet<M extends MissionState>(m: M): M {
  if (!multipliers(m).tacticalNet) return m;
  return { ...m, netOff: !m.netOff };
}

/** Move one tenth of the force toward the assault (+1) or the line (-1). */
export function shiftSplit<M extends MissionState>(m: M, step: 1 | -1): M {
  const assaultShare = Math.max(0, Math.min(SPLIT_STEPS, m.assaultShare + step));
  return assaultShare === m.assaultShare ? m : { ...m, assaultShare };
}

export const sentryHold = (m: MissionState): number => m.sentries * SENTRY_HOLD * multipliers(m).sentry;

interface Deployment {
  /** Force sent at the frontier before ammunition is counted. */
  assaultRaw: number;
  /** Force on the line: troopers, plus sentries as far as ammunition allows. */
  hold: number;
  demand: number;
  /** 0..1: how much of the demand the fabricators meet. */
  supplied: number;
}

/** Garrison needed to keep every secured sector from slipping. */
export const holdNeeded = (m: MissionState): number =>
  m.ground.reduce((s, sec, i) => (isSecured(sec) ? s + SECTIONS[i]!.threat : s), 0);

function deployment(m: MissionState): Deployment {
  const total = force(m);
  const need = holdNeeded(m);
  const sentries = Math.min(sentryHold(m), need);
  const assaultRaw = isTacticalNetActive(m) ? Math.max(0, total - Math.max(0, need - sentries)) : (total * m.assaultShare) / SPLIT_STEPS;
  const attacking = frontier(m.ground) < SECTIONS.length ? assaultRaw : 0;
  const demand = (attacking * AMMO_PER_FORCE + sentries * SENTRY_AMMO_PER_HOLD) / multipliers(m).ammoEfficiency;
  const supplied = demand === 0 ? 1 : Math.min(1, ammoSupply(m) / demand);
  return { assaultRaw, hold: total - assaultRaw + sentries * supplied, demand, supplied };
}

export const ammoDemand = (m: MissionState): number => deployment(m).demand;

/** Force actually pressing the frontier: short ammunition blunts it, but never to nothing. */
export function assaultForce(m: MissionState): number {
  const d = deployment(m);
  return d.assaultRaw * (DRY_FORCE + (1 - DRY_FORCE) * d.supplied);
}

export const holdForce = (m: MissionState): number => deployment(m).hold;

/** Force stationed on each secured sector, from the landing pad inward. */
export function garrisons(m: MissionState): number[] {
  let pool = deployment(m).hold;
  return m.ground.map((s, i) => {
    if (!isSecured(s) || pool <= 0) return 0;
    const posted = Math.min(pool, SECTIONS[i]!.threat);
    pool -= posted;
    return posted;
  });
}

// ---------- income and the frontier ----------

export function retainerRate(m: MissionState): number {
  const mult = multipliers(m).retainer;
  return m.ground.reduce((s, sec, i) => (isSecured(sec) ? s + SECTIONS[i]!.threat * RETAINER_PER_THREAT * mult : s), 0);
}

export const incomeRate = retainerRate;

export const supportPower = (m: MissionState): number => BASE_SUPPORT * multipliers(m).support;
export const autoSupportRate = (m: MissionState): number => multipliers(m).autoSupport;

/** Pay bounties for newly reached sectors and log sectors won and lost. */
function settle<M extends MissionState>(before: M, after: M): M {
  let m = after;
  const mult = multipliers(after).retainer;
  for (let i = 0; i < SECTIONS.length; i++) {
    const was = before.ground[i]!;
    const now = m.ground[i]!;
    const def = SECTIONS[i]!;
    if (!isSecured(was) && isSecured(now) && i >= m.deepest) {
      const bounty = def.threat * RETAINER_PER_THREAT * BOUNTY_SECONDS * mult;
      m = { ...m, deepest: i + 1, credits: m.credits + bounty, lifetimeCredits: m.lifetimeCredits + bounty, recovered: m.recovered + bounty };
      m = appendLog(m, 'corp', `SECTOR SECURED: ${def.name}. PROPERTY RECOVERY BOUNTY ${formatNumber(bounty)} CR.`);
    } else if (isSecured(was) && !isSecured(now)) {
      m = appendLog(m, 'sys', `SECTOR LOST: ${def.name}. CONTROL REVERTED. NO CASUALTIES REPORTED.`);
    }
  }
  return m;
}

function withGarrisons<M extends MissionState>(m: M): M {
  const g = garrisons(m);
  return { ...m, ground: m.ground.map((s, i) => ({ ...s, garrison: g[i]! })) };
}

/** WARDEN calls a strike on the frontier: a second of fire, whoever is on the ground. */
export function fireSupport<M extends MissionState>(m: M): M {
  const { states } = assault(m.ground, SECTIONS, supportPower(m), 1);
  return settle(m, { ...m, ground: states });
}

export function tickSecurity<M extends MissionState>(m: M, dt: number): M {
  const posted = withGarrisons(m);
  const pushing = assaultForce(posted) + autoSupportRate(posted) * supportPower(posted);
  const taken = assault(posted.ground, SECTIONS, pushing, dt).states;
  const ground = tickGround(taken, SECTIONS, dt, horrorPressure(m));
  const next = { ...posted, ground };
  const income = retainerRate(next) * dt;
  return settle(m, { ...next, credits: next.credits + income, lifetimeCredits: next.lifetimeCredits + income, recovered: next.recovered + income });
}

/** Security progress on the shared story scale (extraction's metres). */
export function progress(m: MissionState): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + m.recovered) ** PROGRESS_EXPONENT);
}

// ---------- requisitions ----------

export function isSecurityUpgradeUnlocked(m: MissionState, id: string): boolean {
  const u = SECURITY_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.recovered !== undefined && m.recovered < u.unlock.recovered) return false;
  if (u.unlock.trooper && (m.troopers[u.unlock.trooper.id] ?? 0) < u.unlock.trooper.count) return false;
  if (u.unlock.sentries !== undefined && m.sentries < u.unlock.sentries) return false;
  return true;
}

export function availableSecurityUpgrades(m: MissionState) {
  return SECURITY_UPGRADES.filter((u) => !m.upgrades.includes(u.id) && isSecurityUpgradeUnlocked(m, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buySecurityUpgrade<M extends MissionState>(m: M, id: string): M {
  const u = SECURITY_UPGRADES.find((x) => x.id === id);
  if (!u || m.upgrades.includes(id) || !isSecurityUpgradeUnlocked(m, id) || m.credits < u.cost) return m;
  return { ...m, credits: m.credits - u.cost, upgrades: [...m.upgrades, id] };
}

export type { SectionState };
