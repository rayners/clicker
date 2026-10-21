import { ATTRACTIONS, GUARDS } from '../fathom-data/shallows';
import { TRAWLERS } from '../fathom-data/shelf';
import { SPECIMENS } from '../fathom-data/open-water';
import { CITIES } from '../fathom-data/breach';
import { SOURCE_NOTCH } from '../fathom-data/trench';
import { activeBulwarks, bulwarkCost, defence, isBreachOpen, pilotCost, wallCost } from './breach';
import { createFathomGame, type FathomGame } from './game';
import { contained, isAutoEnhanceActive, isOpenWaterOpen, penCost, specimenCost, specimens } from './open-water';
import { attractionCost, attractionRate, guardCost, isAttractionRevealed, isAutoOpenActive, isGuardRevealed, swimmers, watch } from './shallows';
import { boats, buoyCost, coveredRange, isAutoRangeActive, isShelfOpen, isTrawlerRevealed, trawlerCost } from './shelf';
import { reduce, type FathomAction } from './store';
import { crewCost, hullRate, isAutoStationActive, isTrenchOpen, moduleCost } from './trench';
import { availableUpgrades } from './upgrades';
import type { Outfit } from './state';

export interface FathomSimOptions {
  seed: number;
  maxSeconds: number;
  /** Beach passes sold per second while the player is actively playing. */
  activeTaps?: number;
  activeSeconds?: number;
  decisionInterval?: number;
}

export interface FathomSimResult {
  actAt: Record<number, number>;
  terminusAt?: number;
  final: FathomGame;
}

/** How much of the beach the bot keeps watched before it opens more. */
const BEACH_WATCH = 0.6;
const BOATS_PER_BUOY = 4;

type Pick = { action: FathomAction; value: number; cost: number };

/** The cheapest way to get a little more of what is short, or null if nothing is short. */
function safety(o: Outfit): FathomAction | null {
  if (swimmers(o) > 0 && watch(o) < swimmers(o) * BEACH_WATCH) {
    const best = GUARDS.map((g, i) => ({ g, i }))
      .filter(({ i }) => isGuardRevealed(o, i))
      .map(({ g }) => ({ id: g.id, cost: guardCost(g, o.guards[g.id] ?? 0), value: g.covers / guardCost(g, o.guards[g.id] ?? 0) }))
      .filter((x) => x.cost <= o.cash)
      .sort((a, b) => b.value - a.value)[0];
    if (best) return { type: 'hireGuard', id: best.id };
  }
  if (isShelfOpen(o) && boats(o) > 0 && coveredRange(o) < Math.min(10, 1 + boats(o) / BOATS_PER_BUOY) && buoyCost(o) <= o.cash) return { type: 'buyBuoy' };
  if (isOpenWaterOpen(o) && specimens(o) > 0 && contained(o) < specimens(o) && penCost(o) <= o.cash) return { type: 'buyPen' };
  if (isTrenchOpen(o) && o.modules > 0 && hullRate({ ...o, stationDepth: SOURCE_NOTCH }) < 0 && crewCost(o) <= o.cash) return { type: 'hireRepairCrew' };
  if (isBreachOpen(o)) {
    const need = CITIES.reduce((s, c) => s + c.threat * Math.max(1, o.category), 0);
    if (defence(o) < need) {
      if (o.bulwarks > activeBulwarks(o) && pilotCost(o) <= o.cash) return { type: 'hirePilot' };
      if (bulwarkCost(o) <= o.cash * 0.5) return { type: 'buildBulwark' };
      if (wallCost(o) <= o.cash) return { type: 'buildWall' };
    }
  }
  return null;
}

/** Set each dial as far as its safety allows, where no requisition does it already. */
function dials(o: Outfit): FathomAction | null {
  if (!isAutoOpenActive(o) && swimmers(o) > 0) {
    const target = Math.max(1, Math.min(10, Math.floor((watch(o) / swimmers(o)) * 10)));
    if (o.open !== target) return { type: 'shiftOpen', step: o.open < target ? 1 : -1 };
  }
  if (isShelfOpen(o) && !isAutoRangeActive(o) && o.range !== coveredRange(o)) return { type: 'shiftRange', step: o.range < coveredRange(o) ? 1 : -1 };
  if (isOpenWaterOpen(o) && !isAutoEnhanceActive(o)) {
    if (contained(o) < specimens(o) && o.enhance > 0) return { type: 'shiftEnhancement', step: -1 };
    if (o.enhance < 10 && contained({ ...o, enhance: o.enhance + 1 }) >= specimens(o) && specimens(o) > 0) return { type: 'shiftEnhancement', step: 1 };
  }
  if (isTrenchOpen(o) && !isAutoStationActive(o) && o.modules > 0) {
    if (hullRate(o) < 0 && o.stationDepth > 1) return { type: 'shiftStation', step: -1 };
    if (o.stationDepth < 10 && hullRate({ ...o, stationDepth: o.stationDepth + 1 }) >= 0) return { type: 'shiftStation', step: 1 };
  }
  return null;
}

/** Whatever earns most per credit, in any open zone. */
function income(o: Outfit): FathomAction | null {
  const picks: Pick[] = [];
  ATTRACTIONS.forEach((a, i) => {
    if (!isAttractionRevealed(o, i)) return;
    const cost = attractionCost(a, o.attractions[a.id] ?? 0);
    picks.push({ action: { type: 'buyAttraction', id: a.id }, cost, value: attractionRate(o, a) / cost });
  });
  if (isShelfOpen(o)) {
    TRAWLERS.forEach((t, i) => {
      if (!isTrawlerRevealed(o, i)) return;
      const cost = trawlerCost(t, o.trawlers[t.id] ?? 0);
      picks.push({ action: { type: 'buyTrawler', id: t.id }, cost, value: (t.rate * 0.8) / cost });
    });
  }
  if (isOpenWaterOpen(o)) {
    SPECIMENS.forEach((s, i) => {
      if (i > 0 && !SPECIMENS.slice(i - 1).some((x) => (o.specimens[x.id] ?? 0) > 0)) return;
      const cost = specimenCost(s, o.specimens[s.id] ?? 0);
      picks.push({ action: { type: 'catchSpecimen', id: s.id }, cost, value: s.rate / cost });
    });
  }
  if (isTrenchOpen(o)) picks.push({ action: { type: 'buyModule' }, cost: moduleCost(o), value: 5_000 / moduleCost(o) });
  const best = picks.filter((p) => p.cost <= o.cash).sort((a, b) => b.value - a.value)[0];
  return best ? best.action : null;
}

function decide(game: FathomGame): FathomAction | null {
  const o = game.outfit;
  const upgrade = availableUpgrades(o).find((u) => u.cost <= o.cash);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const urgent = safety(o) ?? dials(o);
  if (urgent) return urgent;
  // The story needs the station on the trench floor: once the trench is open, save for it.
  if (isTrenchOpen(o) && o.modules === 0) return moduleCost(o) <= o.cash ? { type: 'buyModule' } : null;
  return income(o);
}

/** A sensible, greedy player: taps for the first stretch, then checks in every few seconds. */
export function simulateFathom(options: FathomSimOptions): FathomSimResult {
  const { seed, maxSeconds, activeTaps = 4, activeSeconds = 20 * 60, decisionInterval = 5 } = options;
  let game = createFathomGame(seed, 0);
  const actAt: Record<number, number> = { 1: 0 };
  let terminusAt: number | undefined;
  for (let t = 1; t <= maxSeconds; t++) {
    const taps = t <= activeSeconds ? activeTaps : t % 10 === 0 ? 1 : 0;
    for (let i = 0; i < taps; i++) game = reduce(game, { type: 'sellPass' });
    if (t % decisionInterval === 0) {
      for (let i = 0; i < 30; i++) {
        const action = decide(game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = reduce(game, { type: 'tick', dt: 1 });
    const o = game.outfit;
    if (actAt[o.act] === undefined) actAt[o.act] = t;
    if (terminusAt === undefined && o.flags.includes('terminus')) {
      terminusAt = t;
      break;
    }
  }
  return { actAt, terminusAt, final: game };
}
