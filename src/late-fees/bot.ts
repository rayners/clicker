import { COUNSELORS, LIGHTS, ZONES } from '../late-fees-data/camp';
import { held } from '../shared/ground';
import {
  availableCampUpgrades,
  counselorCost,
  counselorForce,
  isCounselorRevealed,
  isHeadCounselorActive,
  isLightRevealed,
  lightCost,
  lightDemand,
  lightSupply,
  towerCost,
  watchForce,
} from './camp/economy';
import { BEDS, STAFF } from '../late-fees-data/clinic';
import {
  availableClinicUpgrades,
  bedCost,
  bedRate,
  isAutoDialActive,
  isBedRevealed,
  isStaffRevealed,
  patients,
  protectedCount,
  staffCost,
  suppressantCost,
  watchCapacity,
} from './clinic/economy';
import { AGENTS, POLICIES } from '../late-fees-data/insurer';
import {
  agentCost,
  availableInsurerUpgrades,
  isActuaryActive,
  isAgentRevealed,
  isPolicyRevealed,
  omenRate,
  policyCost,
  policyRate,
  prevention,
  shiftAppetite,
} from './insurer/economy';
import { createLateGame, type LateGame } from './game';
import { runConfigFor } from './sequels';
import { createRun, type CampRun, type ClinicRun, type InsurerRun, type VenueId } from './state';
import { reduce, type LateAction } from './store';
import { tickRun } from './tick';

export interface LateSimOptions {
  seed: number;
  venue?: VenueId;
  maxSeconds: number;
  /** Films already finished (sequels start richer, against a stronger killer). */
  sequels?: number;
  activeClicks?: number;
  activeSeconds?: number;
  decisionInterval?: number;
  trace?(game: LateGame, t: number): void;
}

export interface LateSimResult {
  actAt: Record<number, number>;
  terminusAt?: number;
  final: LateGame;
}

const MIN_PREP_SHARE = 3;

/** Watch what is open, open more with the rest, keep the lights ahead of the work. */
function decideCamp(game: LateGame): LateAction | null {
  const r = game.run as CampRun;
  const upgrade = availableCampUpgrades(r).find((u) => u.cost <= r.cash);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  if (!isHeadCounselorActive(r)) {
    const need = r.zones.reduce((s, z, i) => (z.secured ? s + ZONES[i]!.threat : s), 0);
    const watch = watchForce(r);
    if (watch < need && r.prepShare > MIN_PREP_SHARE) return { type: 'shiftSplit', step: -1 };
    if (watch > need * 1.5 && r.prepShare < 10) return { type: 'shiftSplit', step: 1 };
  }
  // Plan for the night: light demand by day is a quarter of what darkness asks.
  const nightDemand = lightDemand({ ...r, elapsed: 360 + Math.floor(r.elapsed / 540) * 540 });
  if (Math.max(lightDemand(r), nightDemand) > lightSupply(r) * 0.95) {
    let best: { id: string; value: number } | null = null;
    LIGHTS.forEach((l, i) => {
      if (!isLightRevealed(r, i)) return;
      const cost = lightCost(l, r.lights[l.id] ?? 0);
      if (cost > r.cash) return;
      const value = l.rate / cost;
      if (!best || value > best.value) best = { id: l.id, value };
    });
    const pick = best as { id: string; value: number } | null;
    if (pick) return { type: 'buyLight', id: pick.id };
    if (nightDemand > lightSupply(r) * 1.5) return null;
  }
  if (held(r.zones) > r.towers + 2 && towerCost(r) < r.cash * 0.3) return { type: 'buyTower' };
  let best: { id: string; value: number } | null = null;
  COUNSELORS.forEach((c, i) => {
    if (!isCounselorRevealed(r, i)) return;
    const cost = counselorCost(c, r.counselors[c.id] ?? 0);
    if (cost > r.cash) return;
    const value = counselorForce(r, c) / cost;
    if (!best || value > best.value) best = { id: c.id, value };
  });
  const pick = best as { id: string; value: number } | null;
  return pick ? { type: 'hire', id: pick.id } : null;
}

/** How deep the bot wants its patients to sleep, when the watch can cover it. */
const DEEP_TARGET = 0.6;

/** Keep the watch ahead of the deep sleepers, set the dial as deep as it covers, fill beds with the rest. */
function decideClinic(game: LateGame): LateAction | null {
  const r = game.run as ClinicRun;
  const upgrade = availableClinicUpgrades(r).find((u) => u.cost <= r.cash);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const n = patients(r);
  const cover = watchCapacity(r) + protectedCount(r);
  if (!isAutoDialActive(r) && n > 0) {
    const target = Math.max(3, Math.min(10, Math.floor((cover / n) * 10)));
    if (r.remShare < target) return { type: 'shiftRem', step: 1 };
    if (r.remShare > target) return { type: 'shiftRem', step: -1 };
  }
  if (cover < n * DEEP_TARGET) {
    let best: { id: string; value: number } | null = null;
    STAFF.forEach((s, i) => {
      if (!isStaffRevealed(r, i)) return;
      const cost = staffCost(s, r.staff[s.id] ?? 0);
      if (cost > r.cash) return;
      const value = s.watches / cost;
      if (!best || value > best.value) best = { id: s.id, value };
    });
    const pick = best as { id: string; value: number } | null;
    if (pick) return { type: 'hireStaff', id: pick.id };
    if (cover < n * 0.3) return null;
  }
  if (n > 20 && suppressantCost(r) < r.cash * 0.3) return { type: 'buySuppressant' };
  let best: { id: string; value: number } | null = null;
  BEDS.forEach((b, i) => {
    if (!isBedRevealed(r, i)) return;
    const cost = bedCost(b, r.beds[b.id] ?? 0);
    if (cost > r.cash) return;
    const value = bedRate(r, b) / cost;
    if (!best || value > best.value) best = { id: b.id, value };
  });
  const pick = best as { id: string; value: number } | null;
  return pick ? { type: 'buyBed', id: pick.id } : null;
}

/** Keep prevention ahead of the design, push the appetite as far as prevention allows, write policies with the rest. */
function decideInsurer(game: LateGame): LateAction | null {
  const r = game.run as InsurerRun;
  const upgrade = availableInsurerUpgrades(r).find((u) => u.cost <= r.cash);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const p = prevention(r);
  if (!isActuaryActive(r)) {
    if (omenRate(r) > p && r.appetite > 0) return { type: 'shiftAppetite', step: -1 };
    if (r.appetite < 10 && omenRate(shiftAppetite(r, 1)) <= p) return { type: 'shiftAppetite', step: 1 };
  }
  if (r.list.length > 0 && omenRate(r) > p * 0.9) {
    let best: { id: string; value: number } | null = null;
    AGENTS.forEach((a, i) => {
      if (!isAgentRevealed(r, i)) return;
      const cost = agentCost(a, r.agents[a.id] ?? 0);
      if (cost > r.cash) return;
      const value = a.power / cost;
      if (!best || value > best.value) best = { id: a.id, value };
    });
    const pick = best as { id: string; value: number } | null;
    if (pick) return { type: 'hireAgent', id: pick.id };
  }
  let best: { id: string; value: number } | null = null;
  POLICIES.forEach((pol, i) => {
    if (!isPolicyRevealed(r, i)) return;
    const cost = policyCost(pol, r.policies[pol.id] ?? 0);
    if (cost > r.cash) return;
    const value = policyRate(r, pol) / cost;
    if (!best || value > best.value) best = { id: pol.id, value };
  });
  const pick = best as { id: string; value: number } | null;
  return pick ? { type: 'buyPolicy', id: pick.id } : null;
}

const DECIDE: Record<VenueId, (game: LateGame) => LateAction | null> = { camp: decideCamp, clinic: decideClinic, insurer: decideInsurer };
const PRESS: Record<VenueId, LateAction> = { camp: { type: 'whistle' }, clinic: { type: 'reading' }, insurer: { type: 'sell' } };

/** A sensible, greedy player: clicks for the first stretch, then checks in now and then. */
export function simulateLate(options: LateSimOptions): LateSimResult {
  const { seed, maxSeconds, venue = 'camp', sequels = 0, activeClicks = 4, activeSeconds = 20 * 60, decisionInterval = 5 } = options;
  const base = createLateGame(seed, 0);
  const profile = { ...base.profile, sequels, boxOffice: sequels, history: Array.from({ length: sequels }, () => ({ venue, title: '', ending: 'kill', bodyCount: 0, duration: 0 })) };
  let game: LateGame = { ...base, profile, run: createRun(runConfigFor(profile, venue), seed) };
  const actAt: Record<number, number> = { 1: 0 };
  let terminusAt: number | undefined;
  for (let t = 1; t <= maxSeconds; t++) {
    const clicks = t <= activeSeconds ? activeClicks : t % 10 === 0 ? 1 : 0;
    for (let c = 0; c < clicks; c++) game = reduce(game, PRESS[venue]);
    if (t % decisionInterval === 0) {
      for (let i = 0; i < 20; i++) {
        const action = DECIDE[game.run.venue](game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = { ...game, run: tickRun(game.run, 1) };
    if (options.trace && t % 600 === 0) options.trace(game, t);
    if (actAt[game.run.act] === undefined) actAt[game.run.act] = t;
    if (game.run.flags.includes('terminus')) {
      terminusAt = t;
      break;
    }
  }
  return { actAt, terminusAt, final: game };
}
