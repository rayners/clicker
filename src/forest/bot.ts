import { CLASSES, CLASS_IDS, type ClassId } from '../forest-data/classes';
import { REGIONS } from '../forest-data/regions';
import {
  appraisalRate,
  available,
  availableUpgrades,
  buildingCost,
  frontier,
  gatherRate,
  hireCost,
  incomeRate,
  isRegionOpen,
  maxStandingRegions,
  penanceCost,
  project,
  wages,
} from './company';
import { advance, createForestGame, type ForestGame } from './game';
import { isWoodUpgradeAvailable, startWood, woodUpgradeCost, WOOD_ADAPTER } from './wood';
import { WOOD_UPGRADES } from '../forest-data/wood-upgrades';
import { reduce, type ForestAction } from './store';
import type { Company, Composition } from './state';

export interface ForestSimOptions {
  seed: number;
  maxSeconds: number;
  /** Forage taps per second while the player is actively playing. */
  activeTaps?: number;
  activeSeconds?: number;
  decisionInterval?: number;
}

export interface ForestSimResult {
  actAt: Record<number, number>;
  /** Seconds at which each region first opened. */
  openedAt: Record<string, number>;
  terminusAt?: number;
  final: ForestGame;
}

/** Strength the bot aims for, relative to danger: comfortably ahead, not overwhelming. */
const TARGET_RATIO = 1.25;
const PARTIES_PER_REGION = 3;
const WAGE_SHARE = 0.75;
const PENANCE_AT = 35;
/** More blades than this in one party means the company should be arming, not hiring. */
const MAX_BLADES = 8;

const strengthOf = (id: ClassId) => CLASSES.find((k) => k.id === id)!.strength;

/** A party that beats the region: a mender and a scout or two, then blades to reach the target. */
function idealOrder(c: Company, regionIndex: number): Composition {
  const region = REGIONS[regionIndex]!;
  const order: Composition = { blade: 0, mender: 1, scout: regionIndex === 0 ? 1 : 2, mystic: regionIndex >= 2 ? 1 : 0 };
  const per = project(c, region, { blade: 1, mender: 0, scout: 0, mystic: 0 }).strength || strengthOf('blade');
  const rest = project(c, region, order).strength;
  order.blade = Math.max(1, Math.ceil((TARGET_RATIO * region.danger - rest) / per));
  return order;
}

function decide(game: ForestGame): ForestAction | null {
  const c = game.company;
  const f = frontier(c);
  const frontierIndex = REGIONS.indexOf(f.region);

  if (c.blight >= PENANCE_AT && c.silver >= penanceCost(c)) return { type: 'penance' };

  // Arm the hands rather than hire armies: if the frontier (or the region beyond) needs a crowd of blades, buy armour first.
  const nextIndex = Math.min(REGIONS.length - 1, frontierIndex + 1);
  const crowded = idealOrder(c, frontierIndex).blade > MAX_BLADES || idealOrder(c, nextIndex).blade > MAX_BLADES * 2;
  if (crowded) {
    if (c.silver >= buildingCost(c, 'armoury')) return { type: 'buyBuilding', id: 'armoury' };
    // Save for it rather than frittering silver on hires and trinkets.
    if (idealOrder(c, frontierIndex).blade > MAX_BLADES) return frontierWork(c, frontierIndex);
  }

  const upgrade = availableUpgrades(c).find((u) => u.cost <= c.silver * 0.8);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };

  if (gatherRate(c) > appraisalRate(c) * 0.8 && c.silver >= buildingCost(c, 'appraisal')) return { type: 'buyBuilding', id: 'appraisal' };
  const wounded = CLASS_IDS.reduce((s, id) => s + c.wounded[id], 0);
  const roster = CLASS_IDS.reduce((s, id) => s + c.hired[id], 0);
  if (roster > 0 && wounded / roster > 0.2 && c.silver >= buildingCost(c, 'hospice') * 2) return { type: 'buyBuilding', id: 'hospice' };
  if (c.blight > 20 && c.silver >= buildingCost(c, 'chapel') * 2) return { type: 'buyBuilding', id: 'chapel' };


  // Keep the frontier's standing order matched to its danger.
  const want = idealOrder(c, frontierIndex);
  const have = c.orders[f.region.id]!;
  for (const id of CLASS_IDS) {
    if (have[id] !== want[id]) return { type: 'adjustOrder', region: f.region.id, id, step: have[id] < want[id] ? 1 : -1 };
  }

  // The Quartermaster works the frontier first.
  if (maxStandingRegions(c) > 0 && !c.standing.includes(f.region.id)) {
    if (c.standing.length >= maxStandingRegions(c)) return { type: 'toggleStanding', region: c.standing[0]! };
    return { type: 'toggleStanding', region: f.region.id };
  }

  // Hire toward a few frontier parties, within what income can carry.
  // Income can carry the wages, or the strongbox can carry them for ten minutes while parties get going.
  const affordableWages = Math.max(incomeRate(c) * WAGE_SHARE, 0.4, c.silver / 600);
  for (const id of CLASS_IDS) {
    const needed = want[id] * PARTIES_PER_REGION;
    if (c.hired[id] < needed && wages(c) + CLASSES.find((k) => k.id === id)!.wage <= affordableWages && c.silver >= hireCost(c, id)) {
      return { type: 'hire', id };
    }
  }

  // Send what can be sent: frontier first, then anywhere else open.
  if (CLASS_IDS.every((id) => available(c, id) >= want[id])) return { type: 'dispatch', region: f.region.id };
  for (let i = frontierIndex - 1; i >= 0; i--) {
    const region = REGIONS[i]!;
    if (isRegionOpen(c, region) && CLASS_IDS.every((id) => available(c, id) >= c.orders[region.id]![id]) && CLASS_IDS.some((id) => c.orders[region.id]![id] > 0)) {
      return { type: 'dispatch', region: region.id };
    }
  }
  return null;
}

/** While saving for armour: just keep whatever parties can go, going. */
function frontierWork(c: Company, frontierIndex: number): ForestAction | null {
  for (let i = frontierIndex; i >= 0; i--) {
    const region = REGIONS[i]!;
    const order = c.orders[region.id]!;
    if (isRegionOpen(c, region) && CLASS_IDS.some((id) => order[id] > 0) && CLASS_IDS.every((id) => available(c, id) >= order[id])) {
      return { type: 'dispatch', region: region.id };
    }
  }
  return null;
}

/** Seconds between a defending Factor's check-ins, and its forage taps per second while still tapping hard. */
const DEFEND_SECONDS = 5;
const EARLY_TAPS = 4;
const LATE_TAPS = 0.1;
const EARLY_SECONDS = 20 * 60;

/** A company run by its Factor's bot, for the play-as-the-wood tier: taps, and every few seconds clears what it can. */
export function defendCompany<P extends { company: Company; taps: number; decideIn: number }>(p: P, dt: number): P {
  let game = { company: p.company } as ForestGame;
  let taps = p.taps + dt * (p.company.elapsed < EARLY_SECONDS ? EARLY_TAPS : LATE_TAPS);
  while (taps >= 1) {
    game = reduce(game, { type: 'forage' });
    taps -= 1;
  }
  let decideIn = p.decideIn - dt;
  if (decideIn <= 0) {
    decideIn += DEFEND_SECONDS;
    for (let i = 0; i < 30; i++) {
      const action = decide(game);
      if (!action) break;
      const next = reduce(game, action);
      if (next === game) break;
      game = next;
    }
  }
  return { ...p, company: game.company, taps, decideIn };
}

/** A sensible, greedy player. Not optimal: taps for the first stretch, then checks in periodically. */
export function simulateForest(options: ForestSimOptions): ForestSimResult {
  const { seed, maxSeconds, activeTaps = 4, activeSeconds = 20 * 60, decisionInterval = 5 } = options;
  let game = createForestGame(seed, 0);
  const actAt: Record<number, number> = { 1: 0 };
  const openedAt: Record<string, number> = { [REGIONS[0]!.id]: 0 };
  let terminusAt: number | undefined;
  for (let t = 1; t <= maxSeconds; t++) {
    const taps = t <= activeSeconds ? activeTaps : t % 10 === 0 ? 1 : 0;
    for (let i = 0; i < taps; i++) game = reduce(game, { type: 'forage' });
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
    const c = game.company;
    if (actAt[c.act] === undefined) actAt[c.act] = t;
    for (const r of REGIONS) if (openedAt[r.id] === undefined && isRegionOpen(c, r)) openedAt[r.id] = t;
    if (terminusAt === undefined && c.flags.includes('terminus')) {
      terminusAt = t;
      break;
    }
  }
  return { actAt, openedAt, terminusAt, final: game };
}

export interface WoodSimOptions {
  seed: number;
  maxSeconds: number;
  /** A wood that never pushes, for comparison. */
  passive?: boolean;
}

/** A sensible wood: grow what sap allows, lean on the least alarmed companies, sleep when the town is too afraid. */
function decideWood(game: ForestGame): ForestAction | null {
  const w = game.wood!;
  const h = w.hunt;
  const upgrade = WOOD_UPGRADES.find((u) => isWoodUpgradeAvailable(w, u.id) && woodUpgradeCost(w, u.id) <= h.dread);
  if (upgrade) return { type: 'buyWoodUpgrade', id: upgrade.id };
  if (!h.dormant && h.notoriety > 4) return { type: 'toggleWoodDormant' };
  if (h.dormant && h.notoriety < 1) return { type: 'toggleWoodDormant' };
  const used = h.split.reduce((a, b) => a + b, 0);
  if (used < h.strength) {
    const order = h.prey.map((p, i) => ({ i, alarm: WOOD_ADAPTER.alarm(p) + h.split[i]! * 0.2 })).sort((a, b) => a.alarm - b.alarm);
    return { type: 'shiftWoodPush', index: order[0]!.i, step: 1 };
  }
  return null;
}

export function simulateWood(options: WoodSimOptions): { harvest: number; upgrades: number; beaten: number; final: ForestGame } {
  let game = startWood(createForestGame(options.seed, 0), options.seed);
  for (let t = 1; t <= options.maxSeconds; t++) {
    if (!options.passive && t % 5 === 0) {
      for (let i = 0; i < 20; i++) {
        const action = decideWood(game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = advance(game, 1);
  }
  const h = game.wood!.hunt;
  return { harvest: h.harvest, upgrades: Object.values(game.wood!.bought).reduce((a, b) => a + b, 0), beaten: h.beaten, final: game };
}
