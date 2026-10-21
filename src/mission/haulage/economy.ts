import { BEACON_LEG, CARS, ENGINES, TUG_MASS, TUG_VALUE, stationName, type CarDef, type EngineDef } from '../../data/haulage/systems';
import { HAULAGE_UPGRADES, type HaulageEffect } from '../../data/haulage/upgrades';
import { HAULAGE_CREW_BOOSTS } from '../../data/haulage/crew-boosts';
import { formatNumber } from '../../shared/format';
import { isCrewEffective } from '../crew';
import { horrorProductionMultiplier } from '../horrors';
import { appendLog } from '../log';
import type { HaulageMission as MissionState } from '../state';

export const COST_GROWTH = 1.15;
/** Cars are the value side of the haul and get dearer a little faster than engines. */
export const CAR_COST_GROWTH = 1.18;
export const MIN_BURN = 1;
export const MAX_BURN = 10;
/** The notch at which speed and fuel rate are quoted: thrust over mass, one unit of fuel per second per four of thrust. */
export const NOMINAL_BURN = 5;
export const DEFAULT_BURN = 5;
const SAFE_BURN = 6;
/** Share of the freight's condition lost per leg for each notch past the strain line, squared. */
const STRAIN = 0.02;
/** Fuel burned per second per point of thrust at the nominal burn. Rises with the square of the burn. */
const FUEL_PER_THRUST = 0.45;
export const FUEL_PRICE = 0.6;
/** A tender sent out to meet the train between stations charges this many times the station price. */
const TENDER_MARKUP = 3;
/** Credits per unit of freight value per unit of distance delivered. */
const PAY = 0.6;
const WINDOW_BONUS = 0.5;
const LEG_BASE = 30;
const LEG_GROWTH = 1.6;
const WINDOW_BASE = 60;
const WINDOW_GROWTH = 1.3;
export const DOCK_SECONDS = 10;
const THRUSTER_PUSH = 1;
/** A dry train coasts on what it has: this share of the gentlest burn's speed, for nothing. */
const COAST = 0.5;
// Haulage's own fit to the shared story scale (1,000 at act 2, 3,200 at the discovery), tuned by the pacing bot:
// freight revenue compounds faster than extraction's ore, so the curve is flatter.
const PROGRESS_SCALE = 3.82;
const PROGRESS_EXPONENT = 3.12;

interface Multipliers {
  thrusters: number;
  autoThrusters: number;
  thrust: number;
  engine: Record<string, number>;
  car: Record<string, number>;
  pay: number;
  fuelEfficiency: number;
  safeBurn: number;
  autopilot: boolean;
  droneLoaders: boolean;
  window: number;
}

function applyEffect(r: Multipliers, e: HaulageEffect): void {
  switch (e.kind) {
    case 'thrusterMultiplier':
      r.thrusters *= e.value;
      break;
    case 'autoThrusters':
      r.autoThrusters += e.value;
      break;
    case 'thrustMultiplier':
      r.thrust *= e.value;
      break;
    case 'engineMultiplier':
      r.engine[e.engine] = (r.engine[e.engine] ?? 1) * e.value;
      break;
    case 'carMultiplier':
      r.car[e.car] = (r.car[e.car] ?? 1) * e.value;
      break;
    case 'payMultiplier':
      r.pay *= e.value;
      break;
    case 'fuelEfficiency':
      r.fuelEfficiency *= e.value;
      break;
    case 'safeBurn':
      r.safeBurn += e.value;
      break;
    case 'autopilot':
      r.autopilot = true;
      break;
    case 'droneLoaders':
      r.droneLoaders = true;
      break;
    case 'windowMultiplier':
      r.window *= e.value;
      break;
  }
}

function multipliers(m: MissionState): Multipliers {
  const r: Multipliers = {
    thrusters: 1,
    autoThrusters: 0,
    thrust: 1,
    engine: {},
    car: {},
    pay: horrorProductionMultiplier(m) * m.config.productionMultiplier,
    fuelEfficiency: 1,
    safeBurn: SAFE_BURN,
    autopilot: false,
    droneLoaders: false,
    window: 1,
  };
  for (const u of HAULAGE_UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(r, u.effect);
  for (const [id, boost] of Object.entries(HAULAGE_CREW_BOOSTS)) if (isCrewEffective(m, id)) applyEffect(r, boost.effect);
  return r;
}

// ---------- purchases ----------

export const engineCost = (def: EngineDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const carCost = (def: CarDef, owned: number): number => Math.ceil(def.baseCost * CAR_COST_GROWTH ** owned);

export function buyEngine<M extends MissionState>(m: M, id: string): M {
  const def = ENGINES.find((e) => e.id === id);
  if (!def) return m;
  const owned = m.engines[id] ?? 0;
  const cost = engineCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, engines: { ...m.engines, [id]: owned + 1 } };
}

export function buyCar<M extends MissionState>(m: M, id: string): M {
  const def = CARS.find((c) => c.id === id);
  if (!def) return m;
  const owned = m.cars[id] ?? 0;
  const cost = carCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, cars: { ...m.cars, [id]: owned + 1 } };
}

/** The first tier is always visible; each further one once the one before it is owned. */
export function isEngineRevealed(m: MissionState, index: number): boolean {
  return index === 0 || ENGINES.slice(index - 1).some((e) => (m.engines[e.id] ?? 0) > 0);
}

export function isCarRevealed(m: MissionState, index: number): boolean {
  return index === 0 || CARS.slice(index - 1).some((c) => (m.cars[c.id] ?? 0) > 0);
}

// ---------- the train ----------

/** Everything a tick needs about the train, worked out once: upgrades, crew and horror folded in. */
interface Train {
  mult: Multipliers;
  thrust: number;
  value: number;
  mass: number;
}

function train(m: MissionState): Train {
  const mult = multipliers(m);
  let thrust = 0;
  for (const e of ENGINES) thrust += (m.engines[e.id] ?? 0) * e.thrust * (mult.engine[e.id] ?? 1) * mult.thrust;
  let value = TUG_VALUE;
  let mass = TUG_MASS;
  for (const c of CARS) {
    const n = m.cars[c.id] ?? 0;
    value += n * c.value * (mult.car[c.id] ?? 1);
    mass += n * c.mass;
  }
  return { mult, thrust, value, mass };
}

const speedOf = (t: Train, burn: number) => (t.thrust * (burn / NOMINAL_BURN)) / t.mass;
const fuelRateOf = (t: Train, burn: number) => (t.thrust * FUEL_PER_THRUST * (burn / NOMINAL_BURN) ** 2) / t.mult.fuelEfficiency;
const windowOf = (t: Train, leg: number) => WINDOW_BASE * WINDOW_GROWTH ** leg * t.mult.window;
const thrusterPowerOf = (t: Train) => (THRUSTER_PUSH * t.mult.thrusters) / t.mass;
/** Credits per unit of distance the freight earns as it moves, at a given condition. */
const earningOf = (t: Train, condition: number) => PAY * t.value * condition * t.mult.pay;

export function engineThrust(m: MissionState, def: EngineDef): number {
  const mult = multipliers(m);
  return def.thrust * (mult.engine[def.id] ?? 1) * mult.thrust;
}

export const thrust = (m: MissionState): number => train(m).thrust;

export function carValue(m: MissionState, def: CarDef): number {
  return def.value * (multipliers(m).car[def.id] ?? 1);
}

/** Freight value per unit of distance: what the whole train earns as it moves. */
export const trainValue = (m: MissionState): number => train(m).value;

export function trainMass(m: MissionState): number {
  return CARS.reduce((s, c) => s + (m.cars[c.id] ?? 0) * c.mass, TUG_MASS);
}

export const safeBurn = (m: MissionState): number => multipliers(m).safeBurn;

export function setBurn<M extends MissionState>(m: M, burn: number): M {
  const next = Math.max(MIN_BURN, Math.min(MAX_BURN, Math.round(burn)));
  return next === m.burn ? m : { ...m, burn: next };
}

/** Distance per second on the engines alone, at a given notch. */
export const speed = (m: MissionState, burn: number): number => speedOf(train(m), burn);

export const fuelRate = (m: MissionState, burn: number): number => fuelRateOf(train(m), burn);

// ---------- legs and windows ----------

export const legDistance = (leg: number): number => LEG_BASE * LEG_GROWTH ** leg;

export const legWindow = (m: MissionState, leg: number): number => windowOf(train(m), leg);

export const isDocked = (m: MissionState): boolean => m.docked > 0;

function fuelForLegOf(m: MissionState, t: Train): number {
  const burn = burnOf(m, t);
  const v = speedOf(t, burn);
  if (v <= 0) return 0;
  return ((legDistance(m.leg) - m.travelled) / v) * fuelRateOf(t, burn);
}

/** Fuel for what is left of this leg (or all of the next one, at a dock), at the burn the tug will fly. */
export const fuelForLeg = (m: MissionState): number => fuelForLegOf(m, train(m));

/** Station price at a dock; under way, only a tender can bring fuel out, at a markup. */
export const fuelPrice = (m: MissionState): number => (isDocked(m) ? FUEL_PRICE : FUEL_PRICE * TENDER_MARKUP);

/** Fuel for the rest of the leg (the next one, at a dock), as far as the credits go. */
export function refuel<M extends MissionState>(m: M): M {
  const price = fuelPrice(m);
  const want = Math.max(0, fuelForLeg(m) - m.fuel);
  const bought = Math.min(want, m.credits / price);
  if (bought <= 0) return m;
  return { ...m, credits: m.credits - bought * price, fuel: m.fuel + bought };
}

// ---------- the burn: player or autopilot ----------

const autopilotOn = (m: MissionState, t: Train) => t.mult.autopilot && !m.autopilotOff;

export const isAutopilotActive = (m: MissionState): boolean => autopilotOn(m, train(m));

/** Take the burn back from WARDEN, or hand it over again. Only once the autopilot is installed. */
export function toggleAutopilot<M extends MissionState>(m: M): M {
  if (!multipliers(m).autopilot) return m;
  return { ...m, autopilotOff: !m.autopilotOff };
}

/**
 * WARDEN's choice: the notch that earns most per second for the rest of the leg, with the window bonus, the fuel
 * bill and the time all weighed. Never past the strain line.
 */
function autopilotBurn(m: MissionState, t: Train): number {
  const safe = Math.min(MAX_BURN, t.mult.safeBurn);
  if (t.thrust <= 0) return safe;
  const remaining = legDistance(m.leg) - m.travelled;
  const window = windowOf(t, m.leg);
  // Fuel spent per credit earned, per notch: the share of the freight's pay the tanks eat.
  const share = (FUEL_PRICE * FUEL_PER_THRUST * t.mass) / (PAY * t.value * t.mult.fuelEfficiency * NOMINAL_BURN);
  let best = safe;
  let bestRate = -Infinity;
  for (let burn = MIN_BURN; burn <= safe; burn++) {
    const seconds = remaining / speedOf(t, burn);
    const bonus = m.legTime + seconds <= window ? 1 + WINDOW_BONUS : 1;
    const rate = (bonus - share * burn) / (seconds + DOCK_SECONDS);
    if (rate > bestRate) {
      best = burn;
      bestRate = rate;
    }
  }
  return best;
}

const burnOf = (m: MissionState, t: Train) => (autopilotOn(m, t) ? autopilotBurn(m, t) : m.burn);

export const effectiveBurn = (m: MissionState): number => burnOf(m, train(m));

// ---------- manual bursts and the tick ----------

/** Distance one burst of the manoeuvring thrusters moves the train: the heavier the train, the less. */
export const thrusterPower = (m: MissionState): number => thrusterPowerOf(train(m));
export const autoThrusterRate = (m: MissionState): number => multipliers(m).autoThrusters;

/** What this leg will have paid by the station: earned so far, the rest at today's train, and the bonus if inside the window now. */
export function deliveryPay(m: MissionState): number {
  const t = train(m);
  const onTime = m.legTime <= windowOf(t, m.leg);
  const leg = m.accrued + earningOf(t, m.condition) * (legDistance(m.leg) - m.travelled);
  return leg * (onTime ? 1 + WINDOW_BONUS : 1);
}

function speedNow(m: MissionState, t: Train): number {
  const engines = m.fuel > 0 ? speedOf(t, burnOf(m, t)) : speedOf(t, MIN_BURN) * COAST;
  return engines + t.mult.autoThrusters * thrusterPowerOf(t);
}

/** How fast the train is going now: on the engines with fuel, coasting without, plus WARDEN's thruster bursts. */
export const currentSpeed = (m: MissionState): number => speedNow(m, train(m));

/** Expected credits per second: the freight earning as it moves, less the time spent at docks. */
export function incomeRate(m: MissionState): number {
  const t = train(m);
  const v = speedNow(m, t);
  if (v <= 0) return 0;
  const moving = legDistance(m.leg) / v;
  const onTime = m.legTime <= windowOf(t, m.leg);
  const perSecond = earningOf(t, m.condition) * v * (onTime ? 1 + WINDOW_BONUS : 1);
  return (perSecond * moving) / (moving + DOCK_SECONDS);
}

function arrive<M extends MissionState>(m: M, t: Train): M {
  const onTime = m.legTime <= windowOf(t, m.leg);
  const bonus = onTime ? m.accrued * WINDOW_BONUS : 0;
  const station = stationName(m.leg);
  let next: M = {
    ...m,
    credits: m.credits + bonus,
    lifetimeCredits: m.lifetimeCredits + bonus,
    delivered: m.delivered + bonus,
    onTime: m.onTime + (onTime ? 1 : 0),
    leg: m.leg + 1,
    travelled: 0,
    accrued: 0,
    legTime: 0,
    condition: 1,
    docked: DOCK_SECONDS,
  };
  const damaged = m.condition < 1 ? ` FREIGHT CONDITION ${Math.round(m.condition * 100)}%.` : '';
  const paid = onTime ? ` ${formatNumber(m.accrued)} CR HAULED, +${formatNumber(bonus)} CR WINDOW BONUS.` : ` ${formatNumber(m.accrued)} CR HAULED. WINDOW MISSED: NO BONUS.`;
  next = appendLog(next, 'corp', `DELIVERED AT ${station}.${paid}${damaged}`);
  if (t.mult.droneLoaders) next = refuel(next);
  return next;
}

/** Push the train along the current leg, delivering if it gets there. */
function travel<M extends MissionState>(m: M, t: Train, distance: number, burn: number): M {
  if (distance <= 0) return m;
  const length = legDistance(m.leg);
  const covered = Math.min(distance, length - m.travelled);
  const over = Math.max(0, burn - t.mult.safeBurn);
  const condition = Math.max(0, m.condition - STRAIN * over * over * (covered / length));
  // The freight earns as it goes, at the condition it is in.
  const pay = covered * earningOf(t, condition);
  const next = {
    ...m,
    travelled: m.travelled + covered,
    condition,
    accrued: m.accrued + pay,
    credits: m.credits + pay,
    lifetimeCredits: m.lifetimeCredits + pay,
    delivered: m.delivered + pay,
  };
  return next.travelled >= length - 1e-9 ? arrive(next, t) : next;
}

/** A burst on the manoeuvring thrusters: a little distance, no fuel. Nothing to push against at a dock. */
export function fireThrusters<M extends MissionState>(m: M): M {
  if (isDocked(m)) return m;
  const t = train(m);
  return travel(m, t, thrusterPowerOf(t), MIN_BURN);
}

export function tickHaulage<M extends MissionState>(m: M, dt: number): M {
  if (isDocked(m)) {
    const docked = Math.max(0, m.docked - dt);
    return { ...m, docked };
  }
  const t = train(m);
  const burn = burnOf(m, t);
  const rate = fuelRateOf(t, burn);
  // Whatever share of the second the tank can't pay for, the train coasts.
  const share = rate > 0 ? Math.min(1, m.fuel / (rate * dt)) : 0;
  const coasting = speedOf(t, MIN_BURN) * COAST * dt * (1 - share);
  const distance = speedOf(t, burn) * dt * share + coasting + t.mult.autoThrusters * thrusterPowerOf(t) * dt;
  const fuelled = { ...m, fuel: Math.max(0, m.fuel - rate * dt * share), legTime: m.legTime + dt };
  return travel(fuelled, t, distance, burn);
}

/** Haulage progress on the shared story scale (extraction's metres). */
export function progress(m: MissionState): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + m.delivered) ** PROGRESS_EXPONENT);
}

export const answeredBeacon = (m: MissionState): boolean => m.leg > BEACON_LEG;

// ---------- requisitions ----------

export function isHaulageUpgradeUnlocked(m: MissionState, id: string): boolean {
  const u = HAULAGE_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.delivered !== undefined && m.delivered < u.unlock.delivered) return false;
  if (u.unlock.engine && (m.engines[u.unlock.engine.id] ?? 0) < u.unlock.engine.count) return false;
  if (u.unlock.car && (m.cars[u.unlock.car.id] ?? 0) < u.unlock.car.count) return false;
  return true;
}

export function availableHaulageUpgrades(m: MissionState) {
  return HAULAGE_UPGRADES.filter((u) => !m.upgrades.includes(u.id) && isHaulageUpgradeUnlocked(m, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyHaulageUpgrade<M extends MissionState>(m: M, id: string): M {
  const u = HAULAGE_UPGRADES.find((x) => x.id === id);
  if (!u || m.upgrades.includes(id) || !isHaulageUpgradeUnlocked(m, id) || m.credits < u.cost) return m;
  return { ...m, credits: m.credits - u.cost, upgrades: [...m.upgrades, id] };
}
