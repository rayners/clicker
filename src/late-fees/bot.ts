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
import { createLateGame, type LateGame } from './game';
import { runConfigFor } from './sequels';
import { createRun, type CampRun, type VenueId } from './state';
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
    for (let c = 0; c < clicks; c++) game = reduce(game, { type: 'whistle' });
    if (t % decisionInterval === 0) {
      for (let i = 0; i < 20; i++) {
        const action = decideCamp(game);
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
