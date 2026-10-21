import { ACCIDENTS, AGENTS, POLICIES, type AgentDef, type PolicyDef } from '../../late-fees-data/insurer';
import { INSURER_UPGRADES, type InsurerEffect } from '../../late-fees-data/insurer-upgrades';
import { formatNumber } from '../../shared/format';
import { appendLog } from '../../shared/log';
import { nextRandom } from '../../shared/rng';
import { killerPressure } from '../killers';
import type { Signals } from '../kinds';
import type { EntryKind, InsurerRun as Run } from '../state';

export const COST_GROWTH = 1.15;
export const AGENT_COST_GROWTH = 1.2;
const APPETITE_STEPS = 10;
export const DEFAULT_APPETITE = 5;
/** Seconds a name must be held safe before the design moves on. */
export const DUE_SECONDS = 120;
/** Omens per second per (premium per second)^0.6: the bigger the book, the more Death notices. */
const OMEN_K = 0.014;
const OMEN_EXPONENT = 0.6;
/** Skipped names make the design faster: by this much at the first, slowing as the skips pile up. */
const CHEAT_ANGER = 0.15;
/** Seconds of premium a claim costs. */
const PAYOUT_SECONDS = 120;
const REPUTATION_HIT = 0.9;
const REPUTATION_RECOVERY_SECONDS = 900;
const REPUTATION_FLOOR = 0.4;
const BASE_SALE = 1;
/** Premiums run richer than the other tapes' takings: prevention takes a steady cut (tuned by the pacing bot). */
const PREMIUM_SCALE = 1.2;
// Same curve as DEEP CONTRACT's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

interface Multipliers {
  sale: number;
  autoSale: number;
  policy: Record<string, number>;
  premium: number;
  prevention: number;
  payout: number;
  actuary: boolean;
}

function applyEffect(m: Multipliers, e: InsurerEffect): void {
  switch (e.kind) {
    case 'saleMultiplier':
      m.sale *= e.value;
      break;
    case 'autoSale':
      m.autoSale += e.value;
      break;
    case 'policyMultiplier':
      m.policy[e.policy] = (m.policy[e.policy] ?? 1) * e.value;
      break;
    case 'premiumMultiplier':
      m.premium *= e.value;
      break;
    case 'preventionMultiplier':
      m.prevention *= e.value;
      break;
    case 'payoutReduction':
      m.payout *= e.value;
      break;
    case 'actuary':
      m.actuary = true;
      break;
  }
}

function multipliers(r: Run): Multipliers {
  const m: Multipliers = { sale: 1, autoSale: 0, policy: {}, premium: r.config.productionMultiplier, prevention: 1, payout: 1, actuary: false };
  for (const u of INSURER_UPGRADES) if (r.upgrades.includes(u.id)) applyEffect(m, u.effect);
  return m;
}

// ---------- purchases ----------

export const policyCost = (def: PolicyDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const agentCost = (def: AgentDef, owned: number): number => Math.ceil(def.baseCost * AGENT_COST_GROWTH ** owned);

export function buyPolicy<R extends Run>(r: R, id: string): R {
  const def = POLICIES.find((p) => p.id === id);
  if (!def) return r;
  const owned = r.policies[id] ?? 0;
  const cost = policyCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, policies: { ...r.policies, [id]: owned + 1 } };
}

export function hireAgent<R extends Run>(r: R, id: string): R {
  const def = AGENTS.find((a) => a.id === id);
  if (!def) return r;
  const owned = r.agents[id] ?? 0;
  const cost = agentCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, agents: { ...r.agents, [id]: owned + 1 } };
}

export const isPolicyRevealed = (r: Run, index: number): boolean => index === 0 || POLICIES.slice(index - 1).some((p) => (r.policies[p.id] ?? 0) > 0);
export const isAgentRevealed = (r: Run, index: number): boolean => index === 0 || AGENTS.slice(index - 1).some((a) => (r.agents[a.id] ?? 0) > 0);

// ---------- premiums, the design and prevention ----------

export function policyRate(r: Run, def: PolicyDef): number {
  const m = multipliers(r);
  return def.rate * PREMIUM_SCALE * (m.policy[def.id] ?? 1) * m.premium;
}

/** Premium per second before risk appetite and reputation. */
export const bookRate = (r: Run): number => POLICIES.reduce((s, p) => s + (r.policies[p.id] ?? 0) * policyRate(r, p), 0);

const premiumAt = (tenths: number) => 0.5 + tenths / APPETITE_STEPS;
const riskAt = (tenths: number) => premiumAt(tenths) ** 2;

export function prevention(r: Run): number {
  const mult = multipliers(r).prevention;
  return AGENTS.reduce((s, a) => s + (r.agents[a.id] ?? 0) * a.power * mult, 0);
}

function omenRateAt(r: Run, tenths: number): number {
  const book = bookRate(r);
  if (book === 0) return 0;
  return OMEN_K * book ** OMEN_EXPONENT * riskAt(tenths) * (1 + CHEAT_ANGER * Math.log2(1 + r.cheats)) * killerPressure(r, insurerSignals(r));
}

export const isActuaryActive = (r: Run): boolean => multipliers(r).actuary && !r.actuaryOff;

export function toggleActuary<R extends Run>(r: R): R {
  if (!multipliers(r).actuary) return r;
  return { ...r, actuaryOff: !r.actuaryOff };
}

/** The appetite in force: the claims manager's, or the highest the mainframe finds prevention can keep up with. */
export function appetite(r: Run): number {
  if (!isActuaryActive(r)) return r.appetite;
  const p = prevention(r);
  for (let t = APPETITE_STEPS; t > 0; t--) if (omenRateAt(r, t) <= p) return t;
  return 0;
}

export function shiftAppetite<R extends Run>(r: R, step: 1 | -1): R {
  const next = Math.max(0, Math.min(APPETITE_STEPS, r.appetite + step));
  return next === r.appetite ? r : { ...r, appetite: next };
}

/** How fast the design completes for the name at the top of the list. */
export const omenRate = (r: Run): number => omenRateAt(r, appetite(r));

/** Prevention is keeping up: the omens are held back and the clock to a skip is running. */
export const isHeld = (r: Run): boolean => r.list.length > 0 && prevention(r) >= omenRate(r);

export function incomeRate(r: Run): number {
  const reputation = REPUTATION_FLOOR + (1 - REPUTATION_FLOOR) * r.reputation;
  return bookRate(r) * premiumAt(appetite(r)) * reputation;
}

export const salePower = (r: Run): number => BASE_SALE * multipliers(r).sale;
export const autoSaleRate = (r: Run): number => multipliers(r).autoSale;

/** The claims manager sells a policy over the counter. */
export function sellPolicy<R extends Run>(r: R): R {
  const p = salePower(r);
  return { ...r, cash: r.cash + p, lifetimeCash: r.lifetimeCash + p };
}

const log = <R extends Run>(r: R, kind: EntryKind, text: string) => appendLog<EntryKind, R>(r, kind, text);

/** Pay a claim: cash the company may not have, and its good name. */
export function payClaim<R extends Run>(r: R): R {
  const amount = (incomeRate(r) * PAYOUT_SECONDS) / multipliers(r).payout;
  return { ...r, cash: Math.max(0, r.cash - amount), payouts: r.payouts + amount, reputation: r.reputation * REPUTATION_HIT };
}

/** The design completes: an accident, a death, a claim. */
function accident<R extends Run>(r: R): R {
  const [victim, ...rest] = r.list;
  const [roll, rng] = nextRandom(r.rng);
  const line = ACCIDENTS[Math.floor(roll * ACCIDENTS.length)]!.replace('{victim}', victim!);
  const before = r.payouts;
  const paid = payClaim({ ...r, rng, list: rest, omens: 0, dueIn: DUE_SECONDS, bodyCount: r.bodyCount + 1 });
  return log(log(paid, 'kill', line), 'news', `CLAIM PAID ON ${victim}: $${formatNumber(paid.payouts - before)}. ${rest.length} NAMES LEFT ON THE LIST.`);
}

/** Prevention held long enough: the design passes over this name, for now, and comes back faster. */
function skip<R extends Run>(r: R): R {
  const [name, ...rest] = r.list;
  return log({ ...r, list: [...rest, name!], omens: 0, dueIn: DUE_SECONDS, cheats: r.cheats + 1 }, 'staff', `THE DESIGN SKIPS ${name}. FOR NOW. IT MOVES TO ${rest[0] ?? name}, AND IT IS ANGRIER.`);
}

function design<R extends Run>(r: R, dt: number): R {
  if (r.list.length === 0 || bookRate(r) === 0) return r;
  const rate = omenRate(r);
  const p = prevention(r);
  const omens = Math.max(0, r.omens + (rate - p) * dt);
  if (omens >= 1) return accident(r);
  if (p >= rate) {
    const dueIn = r.dueIn - dt;
    return dueIn <= 0 ? skip(r) : { ...r, omens, dueIn };
  }
  return { ...r, omens };
}

export function tickInsurer<R extends Run>(r: R, dt: number): R {
  const income = (incomeRate(r) + autoSaleRate(r) * salePower(r)) * dt;
  const reputation = Math.min(1, r.reputation + ((1 - r.reputation) * dt) / REPUTATION_RECOVERY_SECONDS);
  return design({ ...r, reputation, cash: r.cash + income, lifetimeCash: r.lifetimeCash + income }, dt);
}

export function progress(r: Run): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + r.lifetimeCash) ** PROGRESS_EXPONENT);
}

/** What the insurer tells the story and the killer. Death does not keep office hours. */
export function insurerSignals(r: Run): Signals {
  return {
    progress: progress(r),
    deep: POLICIES.some((p) => p.deep && (r.policies[p.id] ?? 0) > 0),
    night: POLICIES.some((p) => (r.policies[p.id] ?? 0) > 0),
  };
}

// ---------- the insurer's store ----------

export function isInsurerUpgradeUnlocked(r: Run, id: string): boolean {
  const u = INSURER_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.takings !== undefined && r.lifetimeCash < u.unlock.takings) return false;
  if (u.unlock.policy && (r.policies[u.unlock.policy.id] ?? 0) < u.unlock.policy.count) return false;
  return true;
}

export function availableInsurerUpgrades(r: Run) {
  return INSURER_UPGRADES.filter((u) => !r.upgrades.includes(u.id) && isInsurerUpgradeUnlocked(r, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyInsurerUpgrade<R extends Run>(r: R, id: string): R {
  const u = INSURER_UPGRADES.find((x) => x.id === id);
  if (!u || r.upgrades.includes(id) || !isInsurerUpgradeUnlocked(r, id) || r.cash < u.cost) return r;
  return { ...r, cash: r.cash - u.cost, upgrades: [...r.upgrades, id] };
}
